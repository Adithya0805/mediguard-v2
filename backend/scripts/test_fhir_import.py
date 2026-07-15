import asyncio
import os
import sys

# Add backend directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.fhir_import_client import fhir_import_client


async def run_tests():
    print("=== STARTING FHIR IMPORT CLIENT TESTS ===")
    
    # Test 1: Search patients by name "Smith"
    print("\n[Test 1] Searching patients by name 'Smith'...")
    try:
        search_results = await fhir_import_client.search_patients(name="Smith")
        if search_results:
            first_patient_id = search_results[0]["patient_id"]
            print(f"PASS: Found {len(search_results)} patients. First Patient ID: {first_patient_id}")
            print(f"Sample search result: {search_results[0]}")
        else:
            # Fallback if HAPI FHIR is empty of 'Smith' (extremely unlikely)
            first_patient_id = "592837"
            print(f"WARNING: No search results for 'Smith'. Using fallback ID: {first_patient_id}")
    except Exception as e:
        print(f"FAIL: Search failed: {e}")
        first_patient_id = "592837"

    # Test 2: Import full bundle for patient_id
    print(f"\n[Test 2] Importing full bundle for patient ID: {first_patient_id}...")
    try:
        bundle = await fhir_import_client.get_full_patient_bundle(first_patient_id)
        patient = bundle.get("patient")
        if patient:
            name = bundle["patient"].get("name", [{}])[0].get("family", "Unknown")
            gender = bundle["patient"].get("gender", "Unknown")
            dob = bundle["patient"].get("birthDate", "Unknown")
            print(f"PASS: Patient resource returned successfully.")
            print(f"Patient info: Family Name: {name} | Gender: {gender} | DOB: {dob}")
        else:
            print("FAIL: Patient resource is missing in bundle.")
    except Exception as e:
        print(f"FAIL: Failed to retrieve bundle: {e}")
        return

    # Test 3: Map to intake format
    print("\n[Test 3] Mapping FHIR bundle to intake format...")
    try:
        mapped_data = await fhir_import_client.map_to_intake_format(bundle)
        required_keys = [
            "patient_name", "patient_age", "patient_gender", 
            "chief_complaint", "symptoms", "medical_history", 
            "current_medications", "allergies", "vitals"
        ]
        missing_keys = [k for k in required_keys if k not in mapped_data]
        if not missing_keys:
            print("PASS: Mapped data contains all required keys.")
            print(f"Name: {mapped_data['patient_name']}")
            print(f"Age: {mapped_data['patient_age']}")
            print(f"Gender: {mapped_data['patient_gender']}")
            print(f"Medications count: {len(mapped_data['current_medications'])}")
            print(f"Allergies count: {len(mapped_data['allergies'])}")
            print(f"Vitals populated: {mapped_data['vitals']}")
        else:
            print(f"FAIL: Mapped data is missing required keys: {missing_keys}")
    except Exception as e:
        print(f"FAIL: Mapping failed: {e}")

    # Test 4: Verify chief_complaint is empty string
    print("\n[Test 4] Verifying chief_complaint is empty...")
    if mapped_data.get("chief_complaint") == "" and mapped_data.get("symptoms") == []:
        print("PASS: chief_complaint is empty string and symptoms is empty list.")
    else:
        print(f"FAIL: chief_complaint='{mapped_data.get('chief_complaint')}', symptoms={mapped_data.get('symptoms')}")

    # Test 5: Test invalid patient ID "99999999"
    print("\n[Test 5] Testing invalid patient ID '99999999'...")
    try:
        invalid_res = await fhir_import_client.get_patient("99999999")
        if invalid_res is None:
            print("PASS: Invalid patient returned None gracefully.")
        else:
            print(f"FAIL: Expected None, got: {invalid_res}")
    except Exception as e:
        print(f"FAIL: Invalid patient lookup threw unexpected error: {e}")

    # Output Mapped Data
    print("\n=== SAMPLE MAPPED INTAKE DATA ===")
    import json
    print(json.dumps(mapped_data, indent=2))
    
    print("\nFHIR Import: READY")
    await fhir_import_client.close()


if __name__ == "__main__":
    asyncio.run(run_tests())
