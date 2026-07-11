#!/usr/bin/env python3
"""
MediGuard V2 — Post-Deployment Verification Script

Runs automated E2E tests against public production URLs (Railway & Vercel)
to validate health status, API authentication, schema responses, and security headers.
"""
import sys
import time
import urllib.request
import json
from urllib.error import HTTPError, URLError

# Production Endpoint Configurations
BACKEND_URL = "https://mediguard-v2.onrender.com"
FRONTEND_URL = "https://mediguard-v2.vercel.app"

# Default API Key for validation queries (should map to target production secret)
VALID_API_KEY = "mediguard_v2_secret_api_key_override"


def print_header(title: str):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def print_result(test_num: int, description: str, passed: bool, details: str = ""):
    status = "🟢 PASS" if passed else "🔴 FAIL"
    print(f"[{test_num}] {description:<45} -> {status}")
    if details:
        print(f"    Detail: {details}")


def run_http_request(url: str, method: str = "GET", headers: dict = None, data: dict = None):
    """Executes HTTP request using standard urllib to avoid third-party dependencies."""
    headers = headers or {}
    req_data = None
    
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            duration_ms = round((time.monotonic() - t0) * 1000)
            body = response.read().decode("utf-8")
            resp_headers = dict(response.info())
            return response.status, body, resp_headers, duration_ms
    except HTTPError as e:
        duration_ms = round((time.monotonic() - t0) * 1000)
        body = e.read().decode("utf-8")
        return e.code, body, dict(e.info()), duration_ms
    except URLError as e:
        return 0, str(e.reason), {}, 0


def main():
    print_header("MEDIGUARD V2 PRODUCTION DEPLOYMENT VALIDATION")
    print(f"Backend Target:  {BACKEND_URL}")
    print(f"Frontend Target: {FRONTEND_URL}")
    print("-" * 60)

    all_passed = True
    session_id = None

    # ── TEST 1: Backend health endpoint check ───────────────────────────────
    status, body, _, duration = run_http_request(f"{BACKEND_URL}/health")
    passed = False
    details = ""
    if status == 200:
        try:
            data = json.loads(body)
            if data.get("status") == "healthy":
                passed = True
                details = f"Uptime verified. Response in {duration}ms"
            else:
                details = f"Unexpected health status: {data.get('status')}"
        except json.JSONDecodeError:
            details = "Failed to parse JSON response"
    else:
        details = f"HTTP Status {status}"
        
    print_result(1, "GET /health (Healthy Check)", passed, details)
    if not passed:
        all_passed = False

    # ── TEST 2: Submit intake without API Key ───────────────────────────────
    status, body, _, _ = run_http_request(
        url=f"{BACKEND_URL}/api/v1/patient/session",
        method="POST",
        data={"chief_complaint": "Chest pain"}
    )
    passed = (status == 401)
    print_result(2, "POST /session without API Key (Assert 401)", passed, f"Returned Status {status}")
    if not passed:
        all_passed = False

    # ── TEST 3: Submit intake with valid API Key ────────────────────────────
    headers = {"X-API-Key": VALID_API_KEY}
    minimal_patient = {
        "patient_name": "Post-Deploy Verifier",
        "patient_age": 45,
        "patient_gender": "Male",
        "chief_complaint": "Crushing chest pain radiating to left shoulder",
        "symptoms": ["chest_pain", "shortness_of_breath"],
        "medical_history": ["Hypertension"],
        "current_medications": ["Lisinopril"],
        "allergies": ["Penicillin"],
        "vitals": {"bp": "140/90", "heart_rate": 88, "spo2": 96}
    }
    status, body, _, duration = run_http_request(
        url=f"{BACKEND_URL}/api/v1/patient/session",
        method="POST",
        headers=headers,
        data=minimal_patient
    )
    passed = False
    details = ""
    if status == 201:
        try:
            data = json.loads(body)
            session_id = data.get("session_id")
            if session_id:
                passed = True
                details = f"Session created: {session_id} in {duration}ms"
            else:
                details = "No session_id in response"
        except json.JSONDecodeError:
            details = "Failed to parse JSON body"
    else:
        details = f"HTTP Status {status} - {body[:100]}"
        
    print_result(3, "POST /session with valid API Key (Assert 201)", passed, details)
    if not passed:
        all_passed = False

    # ── TEST 4: Retrieve session details ────────────────────────────────────
    passed = False
    details = ""
    if session_id:
        status, body, _, duration = run_http_request(
            url=f"{BACKEND_URL}/api/v1/patient/session/{session_id}",
            method="GET",
            headers=headers
        )
        if status == 200:
            try:
                data = json.loads(body)
                if data.get("id") == session_id:
                    passed = True
                    details = f"Session matches. Duration: {duration}ms"
                else:
                    details = f"ID mismatch: got {data.get('id')}"
            except json.JSONDecodeError:
                details = "Failed to parse JSON body"
        else:
            details = f"HTTP Status {status}"
    else:
        details = "Skipped (no session_id created in Test 3)"
        
    print_result(4, "GET /session/{id} (Assert 200)", passed, details)
    if not passed:
        all_passed = False

    # ── TEST 5: Measure response latency thresholds ──────────────────────────
    passed = False
    details = ""
    if duration > 0:
        if duration <= 2000:
            passed = True
            details = f"Latency: {duration}ms (Threshold: 2000ms)"
        else:
            details = f"Warning: High latency detected ({duration}ms)"
    else:
        details = "Skipped due to upstream failure"
        
    print_result(5, "Backend Response Time Threshold", passed, details)
    if not passed:
        # Don't fail the entire deploy just on a slight warning, but display it
        pass

    # ── TEST 6: Frontend Landing Page access ────────────────────────────────
    status, body, headers_fe, _ = run_http_request(FRONTEND_URL)
    passed = (status == 200 and "MediGuard" in body)
    print_result(6, "GET Frontend Portal (Assert 200 + 'MediGuard')", passed, f"Status {status}")
    if not passed:
        all_passed = False

    # ── TEST 7: Frontend protected routing behavior ─────────────────────────
    # In Next.js, accessing /dashboard should return 200 OK containing login check scripts or direct HTML
    status, body_dash, _, _ = run_http_request(f"{FRONTEND_URL}/dashboard")
    passed = (status == 200)
    print_result(7, "GET Frontend Protected /dashboard (Assert 200)", passed, f"Status {status}")
    if not passed:
        all_passed = False

    # ── TEST 8: Frontend security headers ───────────────────────────────────
    passed = False
    details = []
    if status == 200:
        x_frame = headers_fe.get("x-frame-options", "").upper()
        x_content = headers_fe.get("x-content-type-options", "").lower()
        
        if "DENY" in x_frame or "SAMEORIGIN" in x_frame:
            details.append("X-Frame-Options: PASS")
        else:
            details.append(f"X-Frame-Options: FAIL (got '{x_frame}')")
            
        if x_content == "nosniff":
            details.append("X-Content-Type-Options: PASS")
        else:
            details.append(f"X-Content-Type-Options: FAIL (got '{x_content}')")
            
        passed = ("FAIL" not in "".join(details))
        
    print_result(8, "Security Headers Checks", passed, ", ".join(details))
    if not passed:
        all_passed = False

    # ── FINAL CONCLUSION ────────────────────────────────────────────────────
    print_header("VERIFICATION SUMMARY")
    if all_passed:
        print("🟢  STATUS: DEPLOYMENT VALIDATED SUCCESSFULLY!")
        print(f"    - Production Backend:  {BACKEND_URL}")
        print(f"    - Production Frontend: {FRONTEND_URL}")
        sys.exit(0)
    else:
        print("🔴  STATUS: DEPLOYMENT HAS ISSUES. PLEASE CHECK LOGS.")
        sys.exit(1)


if __name__ == "__main__":
    main()
