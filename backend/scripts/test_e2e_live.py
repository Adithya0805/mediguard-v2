#!/usr/bin/env python3
"""
MediGuard V2 — End-to-End Live Pipeline Integration Test
Launches the FastAPI server, submits high-risk clinical case for Priya Sharma,
polls progress, prints live audit trails, validates report metrics, and cleans up.
"""

import os
import sys
import time
import subprocess
import signal
import httpx
from uuid import UUID

# Add parent path to allow root package importing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

TEST_PATIENT = {
    "patient_name": "Priya Sharma",
    "patient_age": 38,
    "patient_gender": "female",
    "chief_complaint": "Severe headache for 2 days with visual disturbances and high blood pressure",
    "symptoms": ["severe headache", "visual disturbances", "blurred vision", "nausea", "neck stiffness"],
    "medical_history": ["hypertension", "migraines"],
    "current_medications": ["amlodipine 5mg OD", "sumatriptan 50mg PRN"],
    "allergies": ["NSAIDs"],
    "vitals": {
        "bp": "182/110",
        "heart_rate": 88,
        "temperature": 37.4,
        "spo2": 98,
        "weight": 62,
        "height": 163
    }
}

def check_process_status(proc):
    if proc.poll() is not None:
        print(f"Uvicorn subprocess exited prematurely! Code: {proc.returncode}")
        return False
    return True

def run_e2e_test():
    print("=============================================================================")
    print("                MEDIGUARD V2 - LIVE END-TO-END PIPELINE TEST")
    print("=============================================================================")
    
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 1. Start FastAPI server in subprocess
    print("\n[Step 1] Starting FastAPI Uvicorn Server on port 8000...")
    log_file = open(os.path.join(backend_root, "uvicorn_e2e.log"), "w", encoding="utf-8")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_root,
        stdout=log_file,
        stderr=subprocess.STDOUT
    )
    
    server_online = False
    headers = {"X-API-Key": settings.SECRET_KEY}
    
    try:
        # 2. Wait for /health to return 200
        print("\n[Step 2] Awaiting server online health indicators...")
        start_wait = time.perf_counter()
        
        for attempt in range(1, 151):
            if proc.poll() is not None:
                print("  [FAIL] FastAPI Uvicorn process failed to bind or run.")
                check_process_status(proc)
                return False
                
            try:
                # Poll health check
                with httpx.Client() as client:
                    res = client.get("http://127.0.0.1:8000/api/v1/health", headers=headers, timeout=1.0)
                    if res.status_code == 200:
                        server_online = True
                        duration = (time.perf_counter() - start_wait) * 1000
                        print(f"  [PASS] Server online! Health check succeeded in {duration:.2f}ms")
                        break
            except Exception:
                pass
            time.sleep(1.0)
            
        if not server_online:
            print("  [FAIL] Timeout waiting for FastAPI health endpoint to come online.")
            return False

        # 3. POST /patient/session
        print(f"\n[Step 3] Submitting test patient '{TEST_PATIENT['patient_name']}' to intake register...")
        session_id = None
        start_time = time.perf_counter()
        
        with httpx.Client() as client:
            res = client.post(
                "http://127.0.0.1:8000/api/v1/patient/session",
                json=TEST_PATIENT,
                headers=headers,
                timeout=30.0
            )
            
            if res.status_code != 201:
                print(f"  [FAIL] Patient Intake session submission failed! Status: {res.status_code}")
                print(f"         Response: {res.text}")
                return False
                
            session_id = res.json().get("session_id")
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [PASS] Intake session created. Session ID: {session_id} ({latency:.2f}ms)")
 
        # 4. POST /report/generate
        print(f"\n[Step 4] Triggering LangGraph Multi-Agent pipeline analysis...")
        start_time = time.perf_counter()
        
        with httpx.Client() as client:
            res = client.post(
                "http://127.0.0.1:8000/api/v1/report/generate",
                json={"session_id": session_id},
                headers=headers,
                timeout=30.0
            )
            
            if res.status_code != 202:
                print(f"  [FAIL] Report generation trigger failed! Status: {res.status_code}")
                print(f"         Response: {res.text}")
                return False
                
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [PASS] Report generation enqueued in background tasks successfully. ({latency:.2f}ms)")

        # 5. Poll patient session status
        print(f"\n[Step 5] Polling status and tracking live agents (Max 5 minutes)...")
        poll_interval = 5.0
        max_duration = 300.0
        elapsed = 0.0
        success = False
        
        while elapsed < max_duration:
            time.sleep(poll_interval)
            elapsed += poll_interval
            
            # Query session status
            with httpx.Client(timeout=30.0) as client:
                # 1. Fetch Session Status
                sess_res = client.get(f"http://127.0.0.1:8000/api/v1/patient/session/{session_id}", headers=headers)
                if sess_res.status_code != 200:
                    print(f"  [FAIL] Polling error retrieving session status: {sess_res.status_code}")
                    break
                    
                status = sess_res.json().get("status")
                
                # 2. Fetch Audit Logs to show agent progress
                audit_res = client.get(f"http://127.0.0.1:8000/api/v1/report/{session_id}/audit", headers=headers)
                agents_completed = []
                if audit_res.status_code == 200:
                    logs = audit_res.json()
                    # Check for completed agents in log actions
                    for log in logs:
                        if log.get("action") == "agent_completed":
                            agents_completed.append(log.get("actor"))
                
                print(f"  [{elapsed:.0f}s] Session Status: {status.upper()} | Completed Agents: {agents_completed}")
                
                if status == "completed":
                    print(f"  [PASS] Pipeline completed successfully in {elapsed:.0f} seconds!")
                    success = True
                    break
                elif status == "failed":
                    print(f"  [FAIL] Pipeline reported execution failure state. Inspect backend logs.")
                    break

        if not success:
            print("  [FAIL] End-to-end integration test timed out or pipeline crashed.")
            return False

        # 6. Retrieve Report & Validate
        print(f"\n[Step 6] Compiling final clinical decision support report details...")
        start_time = time.perf_counter()
        
        with httpx.Client() as client:
            res = client.get(f"http://127.0.0.1:8000/api/v1/report/{session_id}", headers=headers, timeout=30.0)
            if res.status_code != 200:
                print(f"  [FAIL] Could not fetch report. Status: {res.status_code}")
                return False
                
            report = res.json()
            latency = (time.perf_counter() - start_time) * 1000
            
            print(f"  [PASS] Report retrieved in {latency:.2f}ms")
            print("  -------------------------------------------------------------")
            print(f"  Urgency Level:      {report.get('urgency_level', '').upper()}")
            print(f"  Clinical Summary:   \"{report.get('clinical_summary', '')[:120]}...\"")
            
            ddx = report.get("differential_diagnosis", [])
            print(f"  Differential Count: {len(ddx)}")
            
            if ddx:
                primary = ddx[0]
                print(f"  Primary Diagnosis:  {primary.get('diagnosis')} (ICD-10: {primary.get('icd10_code')})")
                print(f"  Confidence Rating:  {primary.get('confidence') * 100:.1f}%")
                
            interactions = report.get("drug_interactions_found", [])
            print(f"  Drug Interactions:  {len(interactions)} detected.")
            for item in interactions:
                print(f"                      - {item.get('drug_a')} ↔ {item.get('drug_b')} ({item.get('severity').upper()})")
                
            pdf_url = report.get("report_pdf_url")
            print(f"  PDF Report URL:     {pdf_url}")
            
            fhir = report.get("fhir_bundle")
            print(f"  FHIR Bundle Valid:  {'YES' if fhir else 'NO'}")
            print("  -------------------------------------------------------------")
            
            # Simple assertions to guarantee data presence
            if not pdf_url:
                print("  [FAIL] Clinical PDF report URL was not generated or saved.")
                return False
            if not fhir:
                print("  [FAIL] Structured FHIR bundle is missing from report.")
                return False
            
            return True

    except Exception as e:
        print(f"\n[FAIL] E2E process encountered fatal script crash: {str(e)}")
        return False
        
    finally:
        # 8. Teardown Server cleanly
        print("\n[Step 7] Initiating clean server process termination...")
        if proc:
            try:
                if sys.platform == "win32":
                    proc.terminate()
                else:
                    os.kill(proc.pid, signal.SIGTERM)
                proc.wait(timeout=5.0)
                print("  [PASS] FastAPI Uvicorn server stopped cleanly.")
            except Exception as e:
                print(f"  [WARNING] Force killing server: {str(e)}")
                proc.kill()
        if 'log_file' in locals() and log_file:
            try:
                log_file.close()
            except Exception:
                pass

if __name__ == "__main__":
    result = run_e2e_test()
    print("\n=============================================================================")
    if result:
        print("  \033[92mE2E TEST: PASSED\033[0m")
        print("=============================================================================")
        sys.exit(0)
    else:
        print("  \033[91mE2E TEST: FAILED — Pipeline integration errors occurred.\033[0m")
        print("=============================================================================")
        sys.exit(1)
