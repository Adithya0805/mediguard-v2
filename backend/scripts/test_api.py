#!/usr/bin/env python
"""Integration test script verifying FastAPI routes, exceptions, auth, and mock database flows."""

import os
import sys
import time
import subprocess
import httpx

# Ensure backend package is in system path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

# Active test constants
BASE_URL = f"http://127.0.0.1:{settings.APP_PORT}"
HEADERS = {"X-API-Key": settings.SECRET_KEY}

VALID_PATIENT_PAYLOAD = {
    "patient_name": "Alexander Fleming",
    "patient_age": 55,
    "patient_gender": "male",
    "chief_complaint": "Experiencing persistent high fever, chest pressure, and productive cough.",
    "symptoms": ["cough", "fever", "chest_pressure"],
    "medical_history": ["asthma"],
    "current_medications": ["albuterol"],
    "allergies": ["penicillin"],
    "vitals": {
        "bp": "128/84",
        "heart_rate": 88,
        "temperature": 39.1,
        "spo2": 95
    }
}


def run_test_step(step_num: int, name: str, test_func) -> bool:
    """Executes a single test case logging its timing results and pass metrics."""
    start_time = time.perf_counter()
    try:
        success, message = test_func()
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        if success:
            print(f"[PASS] Step {step_num}: {name:<40} | Time: {duration_ms:6.1f}ms | {message}")
            return True
        else:
            print(f"[FAIL] Step {step_num}: {name:<40} | Time: {duration_ms:6.1f}ms | {message}")
            return False
    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        print(f"[FAIL] Step {step_num}: {name:<40} | Time: {duration_ms:6.1f}ms | INTERCEPTED EXCEPTION: {str(e)}")
        return False


def test_health():
    url = f"{BASE_URL}/api/v1/health"
    r = httpx.get(url)
    if r.status_code == 200 and r.json().get("status") == "healthy":
        return True, "Health check online."
    return False, f"Unexpected response: {r.status_code} - {r.text}"


def test_auth_missing():
    url = f"{BASE_URL}/api/v1/patient/session"
    r = httpx.post(url, json=VALID_PATIENT_PAYLOAD)
    if r.status_code == 401:
        return True, "Authentication successfully blocked unauthorized request."
    return False, f"Expected 401, got: {r.status_code}"


session_id_store = {}


def test_create_session():
    url = f"{BASE_URL}/api/v1/patient/session"
    r = httpx.post(url, headers=HEADERS, json=VALID_PATIENT_PAYLOAD)
    if r.status_code == 201:
        res = r.json()
        session_id_store["id"] = res.get("session_id")
        return True, f"Session created: {session_id_store['id']}"
    return False, f"Failed with: {r.status_code} - {r.text}"


def test_get_session():
    s_id = session_id_store.get("id")
    url = f"{BASE_URL}/api/v1/patient/session/{s_id}"
    r = httpx.get(url, headers=HEADERS)
    if r.status_code == 200 and r.json().get("status") == "pending":
        return True, "Successfully retrieved pending patient session."
    return False, f"Failed: {r.status_code} - {r.text}"


def test_trigger_report():
    s_id = session_id_store.get("id")
    url = f"{BASE_URL}/api/v1/report/generate"
    r = httpx.post(url, headers=HEADERS, json={"session_id": s_id})
    if r.status_code == 202:
        return True, "Report generation triggered. State transitioned to processing."
    return False, f"Failed: {r.status_code} - {r.text}"


def test_get_audits():
    s_id = session_id_store.get("id")
    url = f"{BASE_URL}/api/v1/report/{s_id}/audit"
    r = httpx.get(url, headers=HEADERS)
    if r.status_code == 200:
        logs = r.json()
        actions = [log.get("action") for log in logs]
        return True, f"Retrieved {len(logs)} audit entries. Actions: {actions}"
    return False, f"Failed: {r.status_code} - {r.text}"


def test_list_sessions():
    url = f"{BASE_URL}/api/v1/patient/sessions"
    r = httpx.get(url, headers=HEADERS, params={"limit": 5})
    if r.status_code == 200:
        res = r.json()
        return True, f"Sessions list count: {res.get('count')}"
    return False, f"Failed: {r.status_code} - {r.text}"


def main():
    print("=============================================================================")
    print("                 MEDIGUARD V2 - API INTEGRATION SUITE")
    print("=============================================================================")
    
    # 1. Spin up FastAPI app in subprocess
    print("\n[ACTION] Launching FastAPI uvicorn server subprocess...")
    proc = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "app.main:app",
            "--host", "127.0.0.1",
            "--port", str(settings.APP_PORT)
        ],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    
    # Give uvicorn server 2.5 seconds to bind to port and spin up
    time.sleep(2.5)
    
    # Confirm uvicorn subprocess hasn't crashed on startup
    if proc.poll() is not None:
        print("[CRITICAL ERROR] FastAPI server subprocess crashed on startup!")
        stdout, stderr = proc.communicate()
        if stdout:
            print(f"Stdout:\n{stdout.decode()}")
        if stderr:
            print(f"Stderr:\n{stderr.decode()}")
        sys.exit(1)
        
    print("[SUCCESS] FastAPI server is listening. Running integration endpoints:\n")
    
    test_results = []
    
    # Run tests in strict sequence order
    test_results.append(run_test_step(1, "GET /health check status", test_health))
    test_results.append(run_test_step(2, "POST /patient/session (Blocked Auth)", test_auth_missing))
    test_results.append(run_test_step(3, "POST /patient/session (Valid Intake)", test_create_session))
    test_results.append(run_test_step(4, "GET /patient/session/{session_id}", test_get_session))
    test_results.append(run_test_step(5, "POST /report/generate (Triage workflow)", test_trigger_report))
    test_results.append(run_test_step(6, "GET /report/{session_id}/audit log trails", test_get_audits))
    test_results.append(run_test_step(7, "GET /patient/sessions listing logs", test_list_sessions))
    
    # 2. Terminate server subprocess cleanly
    print("\n[ACTION] Terminating FastAPI server subprocess gracefully...")
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
    print("[SUCCESS] Process exited clean.")
    
    print("\n=============================================================================")
    if all(test_results):
        print("          ALL VERIFICATION STEPS PASSED SUCCESSFULLY! (PHASE 3 LOCKED)")
        sys.exit(0)
    else:
        print("          SOME VERIFICATION STEPS FAILED. PLEASE VERIFY SERVICE LOGS.")
        sys.exit(1)


if __name__ == "__main__":
    main()
