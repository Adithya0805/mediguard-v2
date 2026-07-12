import asyncio
import sys
import os
import uuid

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock embeddings and pinecone to prevent downloading 1.1GB HuggingFace model
import app.rag.embeddings
app.rag.embeddings.get_embeddings = lambda: None
app.rag.embeddings.get_pinecone_index = lambda: None

from app.agents.orchestrator import orchestrator

async def main():
    print("=== STARTING END-TO-END PIPELINE FDA VERIFICATION ===")
    
    # Mock patient data with warfarin and aspirin
    patient_data = {
        "patient_name": "John Doe",
        "patient_age": 65,
        "patient_gender": "male",
        "chief_complaint": "Severe chest discomfort",
        "symptoms": ["chest pain", "shortness of breath"],
        "medical_history": ["atrial fibrillation", "hypertension"],
        "current_medications": ["warfarin 5mg", "aspirin 81mg"],
        "allergies": ["penicillin"],
        "vitals": {
            "bp": "140/90",
            "heart_rate": 88,
            "temperature": 98.6,
            "spo2": 95,
            "weight": 180,
            "height": 70
        }
    }
    
    session_id = str(uuid.uuid4())
    print(f"Created session ID: {session_id}")
    
    # Run the full LangGraph pipeline
    print("Running pipeline...")
    final_state = await orchestrator.run_pipeline(session_id, patient_data)
    
    print("\n--- Pipeline Execution Summary ---")
    print(f"Completed Agents: {final_state.get('completed_agents')}")
    print(f"Urgency Level: {final_state.get('urgency_level')}")
    print(f"Primary Diagnosis: {final_state.get('primary_diagnosis')}")
    print(f"Medication Safe: {final_state.get('medication_safe')}")
    print(f"FDA Data Used: {final_state.get('fda_data_used')}")
    
    # Assertions
    assert final_state.get("fda_data_used") is True, "Expected fda_data_used to be True"
    
    interactions = final_state.get("drug_interactions", [])
    print(f"\nDetected {len(interactions)} drug interactions:")
    for idx, item in enumerate(interactions, 1):
        print(f"  {idx}. {item.get('drug_a')} <-> {item.get('drug_b')} ({item.get('severity')})")
        print(f"     Mechanism: {item.get('mechanism')}")
        print(f"     FDA Cited: {item.get('fda_cited')}")
        print(f"     FDA Source: {item.get('fda_source')}")
        assert "fda_cited" in item, "Interaction missing 'fda_cited' key"
        assert item.get("fda_cited") is True, "Expected fda_cited to be True for warfarin/aspirin"
        assert "fda_source" in item, "Interaction missing 'fda_source' key"
        assert "FDA" in item.get("fda_source", ""), "Expected 'fda_source' to cite the FDA"
        
    print("\n[SUCCESS] E2E FDA Integration tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
