import os
import sys
import tempfile

# Add backend directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.pdf_service import ClinicalPDFGenerator
from reportlab.platypus import SimpleDocTemplate


def run_tests():
    print("=== STARTING PDF SYSTEM GENERATION TESTS ===")
    generator = ClinicalPDFGenerator()

    # Capture elements passed to doc.build for verification
    original_build = SimpleDocTemplate.build
    captured_elements = []

    def mock_build(self, flowables, *args, **kwargs):
        nonlocal captured_elements
        captured_elements = list(flowables)
        return original_build(self, flowables, *args, **kwargs)

    SimpleDocTemplate.build = mock_build

    # Mock patient data
    patient_data = {
        "patient_name": "Arjun Kumar",
        "patient_age": 45,
        "patient_gender": "male",
        "chief_complaint": "Acute sudden-onset crushing chest pain radiating to left arm",
        "symptoms": ["chest pain", "shortness of breath", "diaphoresis"],
        "medical_history": ["type 2 diabetes", "hyperlipidemia"],
        "allergies": ["penicillin"],
        "current_medications": ["metformin 1000mg BD", "atorvastatin 20mg OD"],
        "vitals": {
            "bp": "142/88",
            "heart_rate": 92,
            "temperature": 37.1,
            "spo2": 95,
            "weight": 82.5,
            "height": 176.0
        }
    }

    # Mock report data
    report_data = {
        "urgency_level": "critical",
        "urgency_assessment": "Patient presenting with crushing retrosternal chest pain and borderline hypoxia. High concern for Acute Coronary Syndrome.",
        "executive_summary": "This is a 45-year-old male presenting with chest pain. Workup should urgently exclude acute myocardial infarction or pulmonary embolism.",
        "clinical_narrative": "Patient describes retrosternal pain that started 2 hours ago. Accompanied by diaphoresis and mild shortness of breath. No previous history of CAD.",
        "differential_diagnosis": [
            {
                "rank": 1,
                "diagnosis": "Acute Myocardial Infarction",
                "icd10_code": "I21.9",
                "confidence": 0.85,
                "urgency": "critical",
                "clinical_reasoning": "Crushing retrosternal chest pain radiating to left arm with risk factors."
            },
            {
                "rank": 2,
                "diagnosis": "Angina Pectoris",
                "icd10_code": "I20.9",
                "confidence": 0.65,
                "urgency": "high",
                "clinical_reasoning": "Symptom presentation consistent with myocardial ischemia."
            },
            {
                "rank": 3,
                "diagnosis": "Gastroesophageal Reflux Disease",
                "icd10_code": "K21.9",
                "confidence": 0.20,
                "urgency": "low",
                "clinical_reasoning": "Retrosternal discomfort can mimic cardiac pain."
            }
        ],
        "recommended_tests": [
            "12-Lead Electrocardiogram (ECG) immediately",
            "Serial Troponin I levels (0hr, 3hr)",
            "Chest X-Ray (CXR)",
            "CT Pulmonary Angiography (CTPA) if D-dimer elevated"
        ],
        "drug_interactions_found": [
            {
                "drug_a": "metformin",
                "drug_b": "iodinated contrast",
                "severity": "moderate",
                "management": "Temporarily discontinue metformin at the time of or prior to iodinated contrast procedures and hold for 48 hours."
            }
        ],
        "reviewed_by_agent": "MediGuardOrchestrator v2",
        "follow_up_instructions": [
            "Transfer immediately to cardiac care unit / emergency department.",
            "Repeat ECG serial checks every 15-30 minutes if pain persists.",
            "Maintain continuous pulse oximetry monitoring."
        ]
    }

    session_id = "test-session-uuid-12345678"
    temp_dir = tempfile.gettempdir()
    all_passed = True

    # 1. Test Clinical Report PDF
    print("\n[Test 1] Generating Clinical Report PDF...")
    try:
        captured_elements.clear()
        clinical_bytes = generator.generate_pdf(
            report_data, patient_data, session_id,
            staff_name="Dr. Jameson", institution_name="Metro General Hospital"
        )
        filepath = os.path.join(temp_dir, "test_clinical_report.pdf")
        with open(filepath, "wb") as f:
            f.write(clinical_bytes)
        
        size_kb = len(clinical_bytes) / 1024
        if len(clinical_bytes) > 10240: # 10KB
            print(f"PASS: Clinical Report PDF size is {size_kb:.2f} KB (larger than 10KB). Saved to: {filepath}")
        else:
            print(f"FAIL: Clinical Report PDF size is too small: {size_kb:.2f} KB")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Clinical PDF generation crashed: {e}")
        all_passed = False

    # 2. Test Patient Summary PDF
    print("\n[Test 2] Generating Patient Summary PDF...")
    try:
        captured_elements.clear()
        patient_bytes = generator.generate_patient_summary_pdf(
            report_data, patient_data, session_id,
            staff_name="Dr. Jameson", institution_name="Metro General Hospital"
        )
        filepath = os.path.join(temp_dir, "test_patient_summary.pdf")
        with open(filepath, "wb") as f:
            f.write(patient_bytes)
        
        size_kb = len(patient_bytes) / 1024
        
        # Verify NO ICD-10 codes or raw confidence scores in the flowable elements
        contains_jargon = False
        for el in captured_elements:
            if hasattr(el, 'text'):
                text = str(el.text)
                if "I21.9" in text or "ICD-10" in text or "85%" in text or "65%" in text:
                    contains_jargon = True
                    break
        
        if len(patient_bytes) > 5120 and not contains_jargon: # 5KB
            print(f"PASS: Patient Summary PDF size is {size_kb:.2f} KB, contains no raw ICD codes or jargon. Saved to: {filepath}")
        elif contains_jargon:
            print("FAIL: Patient Summary PDF contains medical code/ICD-10/confidence jargon in flowables.")
            all_passed = False
        else:
            print(f"FAIL: Patient Summary PDF size is too small: {size_kb:.2f} KB")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Patient PDF generation crashed: {e}")
        all_passed = False

    # 3. Test Referral Letter PDF
    print("\n[Test 3] Generating Referral Letter PDF...")
    try:
        class MockStaff:
            full_name = "Dr. Jameson"
            specialization = "Cardiologist"
            
        captured_elements.clear()
        referral_bytes = generator.generate_referral_letter_pdf(
            report_data, patient_data, session_id,
            referring_staff=MockStaff(), institution_name="Metro General Hospital"
        )
        filepath = os.path.join(temp_dir, "test_referral_letter.pdf")
        with open(filepath, "wb") as f:
            f.write(referral_bytes)
        
        size_kb = len(referral_bytes) / 1024
        has_colleague = False
        for el in captured_elements:
            if hasattr(el, 'text') and "Dear Colleague" in str(el.text):
                has_colleague = True
                break
        
        if len(referral_bytes) > 3072 and has_colleague: # 3KB
            print(f"PASS: Referral Letter PDF size is {size_kb:.2f} KB, contains greeting 'Dear Colleague' in elements. Saved to: {filepath}")
        elif not has_colleague:
            print("FAIL: Referral Letter PDF does not contain greeting 'Dear Colleague' in flowable elements.")
            all_passed = False
        else:
            print(f"FAIL: Referral Letter PDF size is too small: {size_kb:.2f} KB")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Referral PDF generation crashed: {e}")
        all_passed = False

    # 4. Test Discharge Summary PDF
    print("\n[Test 4] Generating Discharge Summary PDF...")
    try:
        captured_elements.clear()
        discharge_bytes = generator.generate_discharge_summary_pdf(
            report_data, patient_data, session_id,
            staff_name="Dr. Jameson", institution_name="Metro General Hospital"
        )
        filepath = os.path.join(temp_dir, "test_discharge_summary.pdf")
        with open(filepath, "wb") as f:
            f.write(discharge_bytes)
        
        size_kb = len(discharge_bytes) / 1024
        if len(discharge_bytes) > 5120: # 5KB
            print(f"PASS: Discharge Summary PDF size is {size_kb:.2f} KB. Saved to: {filepath}")
        else:
            print(f"FAIL: Discharge Summary PDF size is too small: {size_kb:.2f} KB")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Discharge PDF generation crashed: {e}")
        all_passed = False

    # 5. Check PDF format prefix
    print("\n[Test 5] Checking PDF file signatures...")
    sigs_ok = True
    for name, pdf_data in [
        ("Clinical", clinical_bytes),
        ("Patient Summary", patient_bytes),
        ("Referral", referral_bytes),
        ("Discharge", discharge_bytes)
    ]:
        if pdf_data.startswith(b"%PDF-"):
            print(f"PASS: {name} has correct PDF signature (%PDF-).")
        else:
            print(f"FAIL: {name} does not start with %PDF- bytes.")
            sigs_ok = False
            all_passed = False

    if all_passed and sigs_ok:
        print("\nPDF System: ALL 4 DOCUMENT TYPES READY")
    else:
        print("\nFAIL: One or more PDF system checks failed.")


if __name__ == "__main__":
    run_tests()
