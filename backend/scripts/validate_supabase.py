#!/usr/bin/env python3
"""
MediGuard V2 — Supabase Live Connection & Integration Validator
Checks tables, records CRUD operations, and bucket uploads with execution timing.
"""

import os
import sys
import time
import uuid
from supabase import create_client, Client
from postgrest.exceptions import APIError

# Add parent path to import app package modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

def validate_supabase():
    print("=============================================================================")
    print("               MEDIGUARD V2 - SUPABASE INTEGRATION VALIDATOR")
    print("=============================================================================")
    
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
    
    is_mock = "mock" in url.lower() or "placeholder" in url.lower() or "your-project" in url.lower()
    
    print(f"Supabase Endpoint: {url}")
    print(f"Service Key:       {key[:10]}... [Masked]")
    if is_mock:
        print("[WARNING] Supabase credentials appear to be local mock placeholders.")
        print("Please configure real credentials in .env to run live server validation.\n")
        print("Supabase: 1 ISSUES (Mock Mode Active)")
        return False

    issues = 0
    client: Client = None

    # Test 1: Connection
    print("\n[Test 1] Establishing connection...")
    start_time = time.perf_counter()
    try:
        client = create_client(url, key)
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [PASS] Connection initialized successfully. Latency: {latency:.2f}ms")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Failed to construct Supabase Client: {str(e)} ({latency:.2f}ms)")
        print("\nSupabase: 1 ISSUES (Connection Failed)")
        return False

    # Test 2: Table existence verification
    required_tables = ["patient_sessions", "agent_runs", "clinical_reports", "audit_logs"]
    print("\n[Test 2] Verifying table schemas exist...")
    
    for table in required_tables:
        start_time = time.perf_counter()
        try:
            # Querying table to verify it's registered in database schema
            client.table(table).select("*").limit(1).execute()
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [PASS] Table '{table}' verified. Response: {latency:.2f}ms")
        except APIError as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Table '{table}' failed schema query: {e.message} ({latency:.2f}ms)")
            print(f"         Hint: Ensure 'create_tables.sql' was executed on Supabase dashboard.")
            issues += 1
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Table '{table}' check error: {str(e)} ({latency:.2f}ms)")
            issues += 1

    if issues > 0:
        print(f"\nSupabase: {issues} ISSUES (Tables missing in schema)")
        return False

    # Test 3: Insert Patient Session
    test_session_id = str(uuid.uuid4())
    print(f"\n[Test 3] Inserting test patient session row (ID: {test_session_id})...")
    start_time = time.perf_counter()
    try:
        session_data = {
            "id": test_session_id,
            "patient_name": "Supabase Connection Validator Test",
            "patient_age": 99,
            "patient_gender": "other",
            "chief_complaint": "Simulated system diagnostic checkups",
            "symptoms": ["system_check"],
            "medical_history": [],
            "current_medications": [],
            "allergies": [],
            "vitals": {"heart_rate": 72, "temperature": 37.0},
            "status": "pending"
        }
        client.table("patient_sessions").insert(session_data).execute()
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [PASS] Test session row successfully upserted. Latency: {latency:.2f}ms")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Session row insertion failed: {str(e)} ({latency:.2f}ms)")
        issues += 1

    # Test 4: Query Session back
    if issues == 0:
        print(f"\n[Test 4] Querying patient session back by id...")
        start_time = time.perf_counter()
        try:
            res = client.table("patient_sessions").select("*").eq("id", test_session_id).execute()
            latency = (time.perf_counter() - start_time) * 1000
            if res.data and res.data[0]["patient_name"] == "Supabase Connection Validator Test":
                print(f"  [PASS] Session row queried. Data integrity verified! Latency: {latency:.2f}ms")
            else:
                print(f"  [FAIL] Session row query returned incomplete data. ({latency:.2f}ms)")
                issues += 1
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Session query failed: {str(e)} ({latency:.2f}ms)")
            issues += 1

    # Test 5: Insert Audit Log entry
    test_log_id = str(uuid.uuid4())
    if issues == 0:
        print(f"\n[Test 5] Inserting test audit_log entry...")
        start_time = time.perf_counter()
        try:
            log_data = {
                "id": test_log_id,
                "session_id": test_session_id,
                "action": "SYSTEM_DIAGNOSTIC",
                "actor": "System Validator Client",
                "metadata": {"test": True, "connection_validation": "supabase"}
            }
            client.table("audit_logs").insert(log_data).execute()
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [PASS] Audit log row successfully inserted. Latency: {latency:.2f}ms")
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Audit log insertion failed: {str(e)} ({latency:.2f}ms)")
            issues += 1

    # Test 6: Query Audit Log
    if issues == 0:
        print(f"\n[Test 6] Querying audit log entries...")
        start_time = time.perf_counter()
        try:
            res = client.table("audit_logs").select("*").eq("id", test_log_id).execute()
            latency = (time.perf_counter() - start_time) * 1000
            if res.data and res.data[0]["action"] == "SYSTEM_DIAGNOSTIC":
                print(f"  [PASS] Audit log verified! Latency: {latency:.2f}ms")
            else:
                print(f"  [FAIL] Audit log query returned no valid data. ({latency:.2f}ms)")
                issues += 1
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Audit query failed: {str(e)} ({latency:.2f}ms)")
            issues += 1

    # Test 7: Delete test rows (Cleanup)
    if test_session_id:
        print(f"\n[Test 7] Cleaning up database test records...")
        start_time = time.perf_counter()
        try:
            # Audit log is deleted first to protect foreign key relationships
            client.table("audit_logs").delete().eq("id", test_log_id).execute()
            client.table("patient_sessions").delete().eq("id", test_session_id).execute()
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [PASS] Database cleanup complete. Latency: {latency:.2f}ms")
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Records cleanup warning: {str(e)} ({latency:.2f}ms)")

    # Test 8: Supabase Storage Integration
    print("\n[Test 8] Testing Supabase Storage ('clinical-reports' bucket)...")
    start_time = time.perf_counter()
    storage_filename = f"validator_test_{uuid.uuid4().hex[:6]}.txt"
    storage_path = f"reports/tests/{storage_filename}"
    test_content = b"MediGuard V2 system connection diagnostics file content."
    
    try:
        # Create bucket if missing
        try:
            client.storage.create_bucket("clinical-reports", options={"public": True})
        except Exception:
            pass
            
        # Upload
        client.storage.from_("clinical-reports").upload(
            path=storage_path,
            file=test_content,
            file_options={"content-type": "text/plain"}
        )
        
        # Get public url
        public_url = client.storage.from_("clinical-reports").get_public_url(storage_path)
        
        # Delete
        client.storage.from_("clinical-reports").remove([storage_path])
        
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [PASS] Storage bucket file lifecycle passed! URL: {public_url}")
        print(f"         Upload/Retrieve/Remove latency: {latency:.2f}ms")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Storage operations failed: {str(e)} ({latency:.2f}ms)")
        issues += 1

    print("\n=============================================================================")
    if issues == 0:
        print("  FINAL INTEGRATION SUMMARY: \033[92mSupabase: READY\033[0m")
        print("=============================================================================")
        return True
    else:
        print(f"  FINAL INTEGRATION SUMMARY: \033[91mSupabase: {issues} ISSUES\033[0m")
        print("=============================================================================")
        return False

if __name__ == "__main__":
    validate_supabase()
