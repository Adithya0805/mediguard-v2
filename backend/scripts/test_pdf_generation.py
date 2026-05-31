import os
import sys
import io
import json
import tempfile

# Reconfigure stdout to use UTF-8 encoding to prevent Windows charmap crash
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ensure we can import from app folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.pdf_service import ClinicalPDFGenerator
from app.services.fhir_service import FHIRBundleGenerator

# Mock Data defined exactly in specifications
session_id = "test-session-12345"

patient_data = {
    "patient_name": "Arjun Kumar", 
    "age": 52, 
    "gender": "male",
    "chief_complaint": "Chest pain and shortness of breath for 3 hours",
    "symptoms": ["chest pain", "dyspnea", "diaphoresis", "nausea"],
    "medical_history": ["hypertension", "type 2 diabetes mellitus"],
    "current_medications": [
        "metformin 500mg BD", 
        "lisinopril 10mg OD", 
        "aspirin 81mg OD"
    ],
    "allergies": ["penicillin"],
    "vitals": {
        "bp": "162/98", 
        "heart_rate": 108, 
        "temperature": 37.2, 
        "spo2": 93, 
        "weight": 88, 
        "height": 172
    }
}

report_data = {
    "executive_summary": "52-year-old male presenting with acute chest pain, dyspnea, and diaphoresis — high suspicion for ACS. Immediate cardiology evaluation recommended.",
    "clinical_narrative": "Patient presents with classic risk factors for acute coronary syndrome including hypertension, diabetes, and an acute presentation of chest pain with autonomic features.",
    "differential_diagnosis": [
        {
            "rank": 1, 
            "diagnosis": "Acute Coronary Syndrome", 
            "icd10_code": "I24.9",
            "confidence": 0.87, 
            "urgency": "immediate",
            "clinical_reasoning": "Classic presentation with risk factors"
        },
        {
            "rank": 2, 
            "diagnosis": "Pulmonary Embolism", 
            "icd10_code": "I26.99",
            "confidence": 0.41, 
            "urgency": "urgent",
            "clinical_reasoning": "Dyspnea and chest pain pattern consistent"
        },
        {
            "rank": 3, 
            "diagnosis": "Hypertensive Crisis", 
            "icd10_code": "I16.9",
            "confidence": 0.31, 
            "urgency": "urgent",
            "clinical_reasoning": "BP 162/98 with symptoms"
        }
    ],
    "primary_diagnosis": {
        "diagnosis": "Acute Coronary Syndrome",
        "icd10_code": "I24.9", 
        "confidence": 0.87
    },
    "recommended_workup": [
        "12-lead ECG immediately",
        "Troponin I/T stat",
        "CBC, BMP, coagulation panel",
        "Chest X-ray",
        "Echocardiogram",
        "Cardiology consult"
    ],
    "drug_interactions": [],
    "contraindications": [],
    "medication_notes": "No significant drug interactions identified. Aspirin 81mg is therapeutically appropriate for ACS management.",
    "urgency_level": "high",
    "urgency_assessment": "High urgency based on cardiac symptom cluster with risk factors. Immediate evaluation required.",
    "disposition_recommendation": "Emergency department admission. Cardiology consult stat. Rule out ACS protocol.",
    "follow_up_instructions": [
        "ECG within 10 minutes of arrival",
        "Serial troponins at 0, 3, and 6 hours",
        "NPO pending cardiology evaluation",
        "IV access, continuous monitoring"
    ],
    "differential_summary": "ACS is the primary concern with 87% confidence. PE and hypertensive crisis are secondary differentials requiring workup to exclude.",
    "clinical_disclaimers": [
        "This report is AI-generated clinical decision support only.",
        "All recommendations must be reviewed by a licensed physician.",
        "This system does not replace clinical judgment."
    ],
    "report_metadata": {
        "agents_used": ["intake", "symptom", "diagnosis", "drug_check", "report"],
        "generation_time_seconds": 18.4,
        "model_used": "claude-3-sonnet",
        "rag_sources_count": 7
    }
}

def main():
    print("="*80)
    print("MEDIGUARD V2 — PHASE 5 DOCUMENT LAYER INTEGRITY TEST")
    print("="*80)

    # Prepare directories
    # On Windows, /tmp creates a folder on the root of the current drive (e.g. D:\tmp)
    tmp_dir = "/tmp"
    try:
        os.makedirs(tmp_dir, exist_ok=True)
    except Exception:
        # Fallback to system temp directory if root drive creation fails
        tmp_dir = tempfile.gettempdir()
        
    pdf_path = os.path.join(tmp_dir, "test_mediguard_report.pdf")
    fhir_path = os.path.join(tmp_dir, "test_mediguard_fhir.json")

    print(f"\n[+] Output directory designated: {tmp_dir}")

    # ==========================================
    # TEST STEP 1: PDF GENERATION
    # ==========================================
    print("\n--- STEP 1: Running Clinical PDF Report Generator ---")
    try:
        pdf_gen = ClinicalPDFGenerator()
        pdf_bytes = pdf_gen.generate_pdf(report_data, patient_data, session_id)
        
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
            
        file_size_kb = len(pdf_bytes) / 1024.0
        print(f"[SUCCESS] PDF successfully written in-memory and saved to disk.")
        print(f"[SUCCESS] PDF Location: {pdf_path}")
        print(f"[SUCCESS] PDF Binary Size: {file_size_kb:.2f} KB ({len(pdf_bytes)} bytes)")
        
        # Verify PDF file size > 10KB
        if len(pdf_bytes) > 10240:
            print("[PASS] STEP 1: Clinical PDF report generated is > 10KB")
        else:
            print("[FAIL] STEP 1: PDF generated size is too small (< 10KB)")
    except Exception as e:
        print(f"[FAIL] STEP 1: PDF generation crashed: {str(e)}")

    # ==========================================
    # TEST STEP 2: FHIR BUNDLE COMPILATION
    # ==========================================
    print("\n--- STEP 2: Running HL7 FHIR R4 Bundle Generator ---")
    try:
        fhir_gen = FHIRBundleGenerator()
        fhir_bundle = fhir_gen.generate_bundle(report_data, patient_data, session_id)
        
        with open(fhir_path, "w", encoding="utf-8") as f:
            json.dump(fhir_bundle, f, indent=2)
            
        print(f"[SUCCESS] FHIR Bundle JSON compiled and saved to disk.")
        print(f"[SUCCESS] FHIR Location: {fhir_path}")
        
        # Run validation
        is_valid, issues = fhir_gen.validate_bundle(fhir_bundle)
        if is_valid:
            print("[PASS] STEP 2a: FHIR bundle validation succeeded without issues.")
        else:
            print("[FAIL] STEP 2a: FHIR bundle validation failed:")
            for issue in issues:
                print(f" - {issue}")
                
        # Count resources
        resources = fhir_bundle.get("entry", [])
        print(f"[SUCCESS] Total resources compiled inside bundle: {len(resources)}")
        
        resource_types = [entry.get("resource", {}).get("resourceType") for entry in resources]
        print(f"[SUCCESS] Compiled Resource Catalog: {', '.join(set(resource_types))}")
        
        if len(resources) >= 7:
            print("[PASS] STEP 2b: FHIR bundle contains at least the 7 required standard resources")
        else:
            print(f"[FAIL] STEP 2b: FHIR bundle is missing entries. Total resources: {len(resources)}")
            
    except Exception as e:
        print(f"[FAIL] STEP 2: FHIR Bundle compilation crashed: {str(e)}")

    print("\n" + "="*80)
    print("TEST RESULTS SUMMARY")
    print("="*80)
    print(f"• PDF Report File:  {pdf_path}")
    print(f"• FHIR Bundle File: {fhir_path}")
    print("Please inspect files manually to verify visual elegance and schema compliance.")
    print("="*80)

if __name__ == "__main__":
    main()
