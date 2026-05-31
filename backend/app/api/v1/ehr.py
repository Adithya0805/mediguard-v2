from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.dependencies import get_db, verify_clinical_auth
from app.services.audit_service import AuditService
from app.services.patient_service import PatientService
from app.services.report_service import ReportService
from app.services.fhir_service import FHIRBundleGenerator
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.ehr")
router = APIRouter()

# High-fidelity Hospital Epic/Cerner FHIR R4 Mock Sandbox Patient Database
EHR_SANDBOX_DATABASE = {
    "PATIENT-ACS-9912": {
        "id": "PATIENT-ACS-9912",
        "patient_name": "Jameson Parker",
        "age": 54,
        "gender": "male",
        "chief_complaint": "Severe retrosternal crushing chest pain radiating to left jaw, accompanied by acute dyspnea and clammy diaphoresis starting 30 minutes ago.",
        "symptoms": ["Chest Pain", "Dyspnea", "Diaphoresis", "Jaw Radiation", "Nausea"],
        "medical_history": ["Essential Hypertension", "Hyperlipidemia", "Type 2 Diabetes Mellitus", "Family history of early coronary artery disease"],
        "allergies": ["Penicillin", "Sulfa drugs"],
        "current_medications": ["Lisinopril 20mg daily", "Atorvastatin 40mg daily", "Metformin 500mg twice daily"],
        "vitals": {
            "bp": "148/92",
            "heart_rate": 96,
            "temperature": 98.6,
            "spo2": 93,
            "weight": 88,
            "height": 178
        }
    },
    "PATIENT-STROKE-4021": {
        "id": "PATIENT-STROKE-4021",
        "patient_name": "Eleanor Fitzgerald",
        "age": 68,
        "gender": "female",
        "chief_complaint": "Sudden onset of left-sided muscular weakness, left facial drooping, and slurred expressive aphasia starting 45 minutes prior to presentation.",
        "symptoms": ["Hemiparesis", "Facial Droop", "Aphasia", "Slurred Speech", "Dizziness"],
        "medical_history": ["Chronic Atrial Fibrillation", "Ischemic Stroke (2021)", "Hypertension", "Osteoarthritis"],
        "allergies": ["Shellfish", "Contrast media"],
        "current_medications": ["Warfarin 5mg daily", "Metoprolol Succinate 50mg daily", "Aspirin 81mg daily"],
        "vitals": {
            "bp": "172/104",
            "heart_rate": 88,
            "temperature": 98.2,
            "spo2": 97,
            "weight": 64,
            "height": 162
        }
    }
}

@router.get("/patient/{patient_id}", status_code=status.HTTP_200_OK)
async def get_ehr_patient(
    patient_id: str,
    actor: dict = Depends(verify_clinical_auth)
):
    """
    Fetches full clinical intake datasets from the Epic/Cerner FHIR sandbox.
    Requires clinician JWT session validation.
    """
    logger.info("EHR Sandbox: query patient record", patient_id=patient_id, clinician=actor.get("username"))
    
    patient_record = EHR_SANDBOX_DATABASE.get(patient_id.strip().upper())
    if not patient_record:
        logger.warning("EHR Sandbox: patient record not found", patient_id=patient_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient record with EHR identifier '{patient_id}' not found in sandboxed models."
        )
        
    return patient_record

@router.post("/sync/{session_id}", status_code=status.HTTP_200_OK)
async def sync_session_to_ehr(
    session_id: UUID,
    db: Client = Depends(get_db),
    actor: dict = Depends(verify_clinical_auth)
):
    """
    Retrieves the FHIR R4 bundle compiled for this clinical session,
    validates the resources against HL7 specifications, and syndicates it
    to the active hospital EHR database sandbox.
    """
    username = actor.get("username", "system")
    logger.info("EHR Sandbox: initiating document synchronization", session_id=session_id, clinician=username)
    
    audit_service = AuditService(db)
    patient_service = PatientService(db, audit_service)
    report_service = ReportService(db, audit_service)
    fhir_generator = FHIRBundleGenerator()
    
    try:
        # 1. Retrieve the compiled clinical report carrying the FHIR bundle
        report = await report_service.get_report(session_id)
        if not report.fhir_bundle:
            logger.warning("EHR Sandbox: report FHIR bundle is missing or not compiled yet", session_id=session_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="FHIR bundle not yet generated for this session. Complete analysis first."
            )
            
        # 2. Structurally validate the FHIR bundle
        is_valid, validation_issues = fhir_generator.validate_bundle(report.fhir_bundle)
        if not is_valid:
            logger.warning("EHR Sandbox: FHIR R4 schema validation failed", session_id=session_id, issues=validation_issues)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "FHIR bundle structural schema validation failed.", "issues": validation_issues}
            )
            
        # 3. Simulate record writing to hospital server database
        # (Updates patient_sessions record or audit log events)
        await audit_service.log_action(
            action="ehr_synced",
            actor=username,
            session_id=session_id,
            metadata={
                "ehr_patient_id": f"EHR-PAT-{str(session_id)[:8]}",
                "fhir_version": "4.0.1",
                "clinician_name": actor.get("name"),
                "clinician_role": actor.get("role")
            }
        )
        
        logger.info("EHR Sandbox: document bundle successfully synchronized", session_id=session_id, clinician=username)
        return {
            "success": True,
            "session_id": str(session_id),
            "synced_at": fhir_generator.generate_bundle.__globals__["datetime"].utcnow().isoformat() + "Z",
            "ehr_record_id": f"EHR-REC-{str(session_id)[:8]}",
            "message": f"Successfully validated and syndicated FHIR document to hospital EHR sandbox for {actor.get('name')}."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("EHR Sandbox: sync transaction failed", session_id=session_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"EHR synchronization transaction failed: {str(e)}"
        )
