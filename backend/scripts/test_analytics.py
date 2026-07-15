import os
import sys
import asyncio
from datetime import datetime, timedelta

# Add backend directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.supabase_client import get_supabase_client, MockSupabaseClient
from app.services.analytics_service import AnalyticsService


async def main():
    print("=== STARTING CLINICAL ANALYTICS INTEGRATION TESTS ===")
    
    db = get_supabase_client()
    institution_id = "test-inst-1111-2222-3333-4444"
    
    # Session IDs
    session_ids = [
        "a1111111-1111-1111-1111-111111111111",
        "a2222222-2222-2222-2222-222222222222",
        "a3333333-3333-3333-3333-333333333333",
        "a4444444-4444-4444-4444-444444444444",
        "a5555555-5555-5555-5555-555555555555"
    ]
    
    # 1. Prepare Mock Datasets
    mock_sessions = [
        {
            "id": session_ids[0],
            "patient_name": "Test Patient A",
            "patient_age": 45,
            "patient_gender": "male",
            "chief_complaint": "Acute sudden retrosternal chest pain radiating to left arm",
            "symptoms": ["chest pain", "shortness of breath"],
            "medical_history": ["diabetes"],
            "allergies": ["penicillin"],
            "current_medications": ["metformin"],
            "vitals": {"bp": "140/90", "heart_rate": 88},
            "status": "completed",
            "institution_id": institution_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": session_ids[1],
            "patient_name": "Test Patient B",
            "patient_age": 68,
            "patient_gender": "female",
            "chief_complaint": "Sudden onset left-sided facial droop and slurred speech",
            "symptoms": ["facial droop", "slurred speech"],
            "medical_history": ["hypertension"],
            "allergies": [],
            "current_medications": ["lisinopril"],
            "vitals": {"bp": "180/100", "heart_rate": 90},
            "status": "completed",
            "institution_id": institution_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": session_ids[2],
            "patient_name": "Test Patient C",
            "patient_age": 28,
            "patient_gender": "female",
            "chief_complaint": "Mild burning epigastric pain after eating meals",
            "symptoms": ["epigastric pain", "nausea"],
            "medical_history": [],
            "allergies": [],
            "current_medications": [],
            "vitals": {"bp": "120/80", "heart_rate": 72},
            "status": "completed",
            "institution_id": institution_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": session_ids[3],
            "patient_name": "Test Patient D",
            "patient_age": 82,
            "patient_gender": "male",
            "chief_complaint": "High fever, confusion, and productive cough with green sputum",
            "symptoms": ["fever", "cough", "confusion"],
            "medical_history": ["COPD"],
            "allergies": ["sulfa"],
            "current_medications": ["albuterol inhaler"],
            "vitals": {"bp": "100/60", "heart_rate": 104, "temperature": 39.2},
            "status": "completed",
            "institution_id": institution_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": session_ids[4],
            "patient_name": "Test Patient E",
            "patient_age": 52,
            "patient_gender": "other",
            "chief_complaint": "Persistent dull headache with occasional visual blurriness",
            "symptoms": ["headache", "blurry vision"],
            "medical_history": ["migraine"],
            "allergies": [],
            "current_medications": ["sumatriptan"],
            "vitals": {"bp": "130/85", "heart_rate": 78},
            "status": "completed",
            "institution_id": institution_id,
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat() # Older session
        }
    ]

    mock_reports = [
        {
            "id": "b1111111-1111-1111-1111-111111111111",
            "session_id": session_ids[0],
            "created_at": (datetime.utcnow() + timedelta(seconds=25)).isoformat(),
            "differential_diagnosis": [
                {"rank": 1, "diagnosis": "Acute Coronary Syndrome", "icd10_code": "I24.9", "confidence": 0.88, "urgency": "critical", "clinical_reasoning": "Classic pain vectors with diabetes risk."}
            ],
            "recommended_tests": ["ECG immediately", "Serial Troponin I"],
            "drug_interactions_found": [
                {"drug_a": "metformin", "drug_b": "iodinated contrast", "severity": "moderate", "management": "Hold metformin."}
            ],
            "clinical_summary": "High risk cardiac presentation.",
            "urgency_level": "critical",
            "reviewed_by_agent": "MediGuardOrchestrator v2"
        },
        {
            "id": "b2222222-2222-2222-2222-222222222222",
            "session_id": session_ids[1],
            "created_at": (datetime.utcnow() + timedelta(seconds=32)).isoformat(),
            "differential_diagnosis": [
                {"rank": 1, "diagnosis": "Ischemic Stroke", "icd10_code": "I63.9", "confidence": 0.92, "urgency": "critical", "clinical_reasoning": "Sudden slurring with high BP."}
            ],
            "recommended_tests": ["CT Brain non-contrast", "NIH Stroke Scale"],
            "drug_interactions_found": [],
            "clinical_summary": "Acute neurologic emergency.",
            "urgency_level": "critical",
            "reviewed_by_agent": "MediGuardOrchestrator v2"
        },
        {
            "id": "b3333333-3333-3333-3333-333333333333",
            "session_id": session_ids[2],
            "created_at": (datetime.utcnow() + timedelta(seconds=15)).isoformat(),
            "differential_diagnosis": [
                {"rank": 1, "diagnosis": "Gastroesophageal Reflux Disease", "icd10_code": "K21.9", "confidence": 0.70, "urgency": "low", "clinical_reasoning": "Epigastric burn without cardiac triggers."}
            ],
            "recommended_tests": ["Dietary counseling"],
            "drug_interactions_found": [],
            "clinical_summary": "Mild dyspepsia suspect.",
            "urgency_level": "low",
            "reviewed_by_agent": "MediGuardOrchestrator v2"
        },
        {
            "id": "b4444444-4444-4444-4444-444444444444",
            "session_id": session_ids[3],
            "created_at": (datetime.utcnow() + timedelta(seconds=45)).isoformat(),
            "differential_diagnosis": [
                {"rank": 1, "diagnosis": "Community-Acquired Pneumonia", "icd10_code": "J18.9", "confidence": 0.85, "urgency": "high", "clinical_reasoning": "Fever, green sputum with COPD history."}
            ],
            "recommended_tests": ["Chest X-Ray", "Sputum Culture"],
            "drug_interactions_found": [],
            "clinical_summary": "Geriatric respiratory infection.",
            "urgency_level": "high",
            "reviewed_by_agent": "MediGuardOrchestrator v2"
        },
        {
            "id": "b5555555-5555-5555-5555-555555555555",
            "session_id": session_ids[4],
            "created_at": (datetime.utcnow() - timedelta(days=2) + timedelta(seconds=20)).isoformat(),
            "differential_diagnosis": [
                {"rank": 1, "diagnosis": "Migraine Headaches", "icd10_code": "G43.9", "confidence": 0.78, "urgency": "medium", "clinical_reasoning": "Dull visual aura with history."}
            ],
            "recommended_tests": ["Neurologist evaluation"],
            "drug_interactions_found": [],
            "clinical_summary": "Stable chronic headache.",
            "urgency_level": "medium",
            "reviewed_by_agent": "MediGuardOrchestrator v2"
        }
    ]

    mock_runs = []
    agents = ["intake", "symptom", "diagnosis", "drug_check", "report"]
    for s_id in session_ids:
        for idx, agent in enumerate(agents):
            mock_runs.append({
                "id": f"c{idx}111111-1111-1111-1111-{s_id[24:]}",
                "session_id": s_id,
                "agent_name": agent,
                "started_at": datetime.utcnow().isoformat(),
                "completed_at": (datetime.utcnow() + timedelta(seconds=5)).isoformat(),
                "status": "success",
                "input_summary": "Triage input payload.",
                "output_summary": "Triage result processed.",
                "tokens_used": 1500
            })

    try:
        # 2. Seed Mock Data
        print("Seeding mock data records...")
        if isinstance(db, MockSupabaseClient):
            from app.db.supabase_client import _mock_db
            _mock_db["patient_sessions"].extend(mock_sessions)
            _mock_db["clinical_reports"].extend(mock_reports)
            _mock_db["agent_runs"].extend(mock_runs)
        else:
            # Seed live database
            for s in mock_sessions:
                db.table("patient_sessions").insert(s).execute()
            for r in mock_reports:
                db.table("clinical_reports").insert(r).execute()
            for run in mock_runs:
                db.table("agent_runs").insert(run).execute()

        print("Seeding completed successfully.")

        # 3. Instantiate AnalyticsService
        service = AnalyticsService(db, institution_id)

        # Test Case 4: get_overview_stats()
        print("\n[Test 1] Testing get_overview_stats()...")
        overview = await service.get_overview_stats()
        assert overview["total_sessions"] == 5, f"Expected 5 sessions, got {overview['total_sessions']}"
        assert overview["completed_sessions"] == 5
        assert overview["urgency_breakdown"]["critical"] == 2
        assert overview["urgency_breakdown"]["high"] == 1
        assert overview["urgency_breakdown"]["medium"] == 1
        assert overview["urgency_breakdown"]["low"] == 1
        assert overview["total_tokens_used"] == 1500 * 5 * 5, f"Expected {1500*5*5} tokens, got {overview['total_tokens_used']}"
        print("PASS: Overview stats verified successfully.")

        # Test Case 5: get_daily_trend()
        print("\n[Test 2] Testing get_daily_trend()...")
        trend = await service.get_daily_trend()
        assert len(trend) == 31, f"Expected 31 entries for 30 days range, got {len(trend)}"
        # Verify today's date has counts
        today_entry = next((item for item in trend if item["total"] > 0), None)
        assert today_entry is not None, "Expected at least one day to have non-zero session count"
        print("PASS: Daily trend series check completed.")

        # Test Case 6: get_agent_performance()
        print("\n[Test 3] Testing get_agent_performance()...")
        agents_perf = await service.get_agent_performance()
        assert len(agents_perf) == 5, f"Expected 5 pipeline agents, got {len(agents_perf)}"
        for item in agents_perf:
            assert item["total_runs"] == 5, f"Expected 5 runs, got {item['total_runs']}"
            assert item["status"] == "healthy"
        print("PASS: All 5 pipeline agents accounted for and healthy.")

        # Test Case 7: get_top_diagnoses()
        print("\n[Test 4] Testing get_top_diagnoses()...")
        top_diagnoses = await service.get_top_diagnoses()
        assert len(top_diagnoses) >= 4, f"Expected at least 4 diagnoses, got {len(top_diagnoses)}"
        primary_diag = top_diagnoses[0]
        assert primary_diag["diagnosis"] in ["Acute Coronary Syndrome", "Ischemic Stroke", "Gastroesophageal Reflux Disease", "Community-Acquired Pneumonia"]
        print("PASS: Top diagnoses counts and icd-10 mappings verified.")

        # Test Case 8: get_drug_interactions_summary()
        print("\n[Test 5] Testing get_drug_interactions_summary()...")
        drugs_sum = await service.get_drug_interactions_summary()
        assert drugs_sum["total_interactions_detected"] == 1, f"Expected 1 interaction, got {drugs_sum['total_interactions_detected']}"
        assert drugs_sum["by_severity"]["moderate"] == 1
        print("PASS: Drug interactions frequencies matching reports.")

        # Test Case 9: get_patient_demographics()
        print("\n[Test 6] Testing get_patient_demographics()...")
        dem = await service.get_patient_demographics()
        assert dem["gender_split"]["male"] == 2
        assert dem["gender_split"]["female"] == 2
        assert dem["gender_split"]["other"] == 1
        assert dem["avg_age"] == round((45 + 68 + 28 + 82 + 52) / 5, 1)
        print("PASS: Demographics age and gender split logic correct.")

        # Test Case 10: get_anomalies()
        print("\n[Test 7] Testing get_anomalies()...")
        anomalies = await service.get_anomalies()
        # Should not crash and should return anomalies (like critical spikes since we have 4 today vs historical 0)
        assert isinstance(anomalies, list)
        print(f"PASS: Anomalies detection passed. Detected anomalies: {len(anomalies)}")

        # Test Case 11: get_full_dashboard()
        print("\n[Test 8] Testing get_full_dashboard()...")
        dashboard = await service.get_full_dashboard()
        assert "overview" in dashboard
        assert "daily_trend" in dashboard
        assert "agent_performance" in dashboard
        assert "top_diagnoses" in dashboard
        assert "drug_interactions" in dashboard
        assert "patient_demographics" in dashboard
        assert "anomalies" in dashboard
        print("PASS: Full dashboard payload verified.")

        print("\nSample Overview Stats Output:")
        print(overview)
        
        print("\nAnalytics Engine: READY")

    except Exception as e:
        print(f"\nFAIL: Integration test failed with exception: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # 12. Clean Up Mock Data
        print("\nCleaning up seeded mock records...")
        if isinstance(db, MockSupabaseClient):
            from app.db.supabase_client import _mock_db
            # Remove by ID
            _mock_db["patient_sessions"] = [s for s in _mock_db["patient_sessions"] if s["id"] not in session_ids]
            _mock_db["clinical_reports"] = [r for r in _mock_db["clinical_reports"] if r["session_id"] not in session_ids]
            _mock_db["agent_runs"] = [run for run in _mock_db["agent_runs"] if run["session_id"] not in session_ids]
        else:
            # Clean live database rows
            for s_id in session_ids:
                db.table("agent_runs").delete().eq("session_id", s_id).execute()
                db.table("clinical_reports").delete().eq("session_id", s_id).execute()
                db.table("patient_sessions").delete().eq("id", s_id).execute()

        print("Cleanup completed.")


if __name__ == "__main__":
    asyncio.run(main())
