#!/usr/bin/env python3
"""
MediGuard V2 — LangSmith Connection & Observability Tracing Validator
Validates LangChain tracing variables, creates and updates a manual test run,
queries it back from the backend API, and prints workspace dashboards.
"""

import os
import sys
import time
from datetime import datetime, timezone
from langsmith import Client

# Add parent path to allow root package importing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

def validate_langsmith():
    print("=============================================================================")
    print("               MEDIGUARD V2 - LANGSMITH TRACING VALIDATOR")
    print("=============================================================================")

    api_key = settings.LANGCHAIN_API_KEY
    project_name = settings.LANGCHAIN_PROJECT
    tracing_enabled = settings.LANGCHAIN_TRACING_V2
    
    is_mock = not api_key or "mock" in api_key.lower() or "placeholder" in api_key.lower()
    
    print(f"LangSmith Project: {project_name}")
    print(f"Tracing Enabled:   {tracing_enabled}")
    print(f"API Key:           {api_key[:8]}... [Masked]" if api_key else "API Key:           [NOT CONFIGURED]")
    
    if is_mock:
        print("[WARNING] LangSmith API Key is mock or placeholder.")
        print("Please configure real credentials in .env to run live tracing validations.\n")
        print("LangSmith: 1 ISSUES (Mock Mode Active)")
        return False

    issues = 0
    client = None

    # Test 1: Initialize Client
    print("\n[Test 1] Initializing LangSmith Client...")
    start_time = time.perf_counter()
    try:
        client = Client(api_key=api_key)
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [PASS] LangSmith Client constructed. Latency: {latency:.2f}ms")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Client initialization failed: {str(e)} ({latency:.2f}ms)")
        print("\nLangSmith: 1 ISSUES (Client Init Failed)")
        return False

    # Test 2: Post run trace
    run_id = None
    print("\n[Test 2] Publishing manual trace run 'mediguard-test-trace'...")
    start_time = time.perf_counter()
    try:
        import uuid
        run_id = uuid.uuid4()
        # Start Run
        client.create_run(
            id=run_id,
            name="mediguard-test-trace",
            run_type="chain",
            inputs={"test": "LangSmith connection test"},
            project_name=project_name
        )
        
        # End Run with outputs
        client.update_run(
            run_id,
            outputs={"result": "connected"},
            end_time=datetime.now(timezone.utc)
        )
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [PASS] Run created and finalized in LangSmith cloud. ID: {run_id} ({latency:.2f}ms)")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Failed to write run: {str(e)} ({latency:.2f}ms)")
        issues += 1

    # Test 3: Fetch run back
    if issues == 0 and run_id:
        print("\n[Test 3] Verifying trace synchronization by fetching run back...")
        start_time = time.perf_counter()
        try:
            # Wait up to 5 seconds with backoff for trace propagation
            fetched_run = None
            for attempt in range(4):
                try:
                    fetched_run = client.read_run(run_id)
                    if fetched_run:
                        break
                except Exception:
                    time.sleep(1.5 ** attempt)
            
            latency = (time.perf_counter() - start_time) * 1000
            
            if fetched_run and fetched_run.name == "mediguard-test-trace":
                print(f"  [PASS] Trace retrieved successfully from cloud! Name matching verified. Latency: {latency:.2f}ms")
            else:
                print(f"  [FAIL] Trace retrieved but returned invalid matching attributes or timed out. ({latency:.2f}ms)")
                issues += 1
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Failed to fetch run from LangSmith API: {str(e)} ({latency:.2f}ms)")
            issues += 1

    # Test 4: Verify .env Tracing Variables
    print("\n[Test 4] Verifying tracing environment configs...")
    if not tracing_enabled:
        print("  [FAIL] LANGCHAIN_TRACING_V2=false. Tracing is disabled in settings configuration.")
        print("         Please set LANGCHAIN_TRACING_V2=true in backend/.env to log agent pipeline operations.")
        issues += 1
    else:
        print("  [PASS] LANGCHAIN_TRACING_V2=true is verified.")

    print("\n=============================================================================")
    if issues == 0:
        print("  FINAL INTEGRATION SUMMARY: \033[92mLangSmith: READY\033[0m")
        print("=============================================================================")
        print("  [INFO] Tracing Workspace Dashboard URL:")
        print(f"  \033[94mhttps://smith.langchain.com/projects/p/{project_name}\033[0m")
        print("  * Open the URL above to see live traces during agent pipeline runs.")
        print("=============================================================================")
        return True
    else:
        print(f"  FINAL INTEGRATION SUMMARY: \033[91mLangSmith: {issues} ISSUES\033[0m")
        print("=============================================================================")
        return False

if __name__ == "__main__":
    validate_langsmith()
