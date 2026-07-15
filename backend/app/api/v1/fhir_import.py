from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client
from typing import Optional
from app.dependencies import get_db, get_current_staff, TokenData
from app.services.fhir_import_client import fhir_import_client
from app.services.audit_service import AuditService
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.fhir_import")
router = APIRouter()


@router.get("/patient/{patient_id}", status_code=status.HTTP_200_OK)
async def get_patient_fhir(
    patient_id: str,
    db: Client = Depends(get_db),
    current_staff: TokenData = Depends(get_current_staff)
):
    """
    Query HAPI FHIR server, aggregate patient R4 resource bundle,
    map to intake payload format, and log HIPAA audit.
    """
    logger.info("Received request to import FHIR patient", patient_id=patient_id, staff_id=current_staff.staff_id)
    try:
        # 1. Fetch full R4 bundle
        bundle = await fhir_import_client.get_full_patient_bundle(patient_id)
        
        # 2. Map to MediGuard intake format
        intake_data = await fhir_import_client.map_to_intake_format(bundle)

        # 3. Log HIPAA audit trail
        audit_service = AuditService(db)
        await audit_service.log_action(
            action="fhir_patient_imported",
            actor=f"staff:{current_staff.staff_id}",
            metadata={
                "fhir_patient_id": patient_id,
                "staff_id": str(current_staff.staff_id),
                "institution_id": str(current_staff.institution_id),
                "institution_code": current_staff.institution_code,
                "patient_name": intake_data.get("patient_name")
            }
        )

        # 4. Formulate completeness statistics
        completeness = {
            "has_vitals": bool(intake_data.get("vitals")),
            "has_medications": bool(intake_data.get("current_medications")),
            "has_allergies": bool(intake_data.get("allergies")),
            "has_history": bool(intake_data.get("medical_history")),
            "missing_fields": ["chief_complaint", "symptoms"]
        }

        return {
            "intake_data": intake_data,
            "fhir_patient_id": patient_id,
            "source": "HAPI FHIR R4",
            "note": "Chief complaint and symptoms must be added by clinician",
            "data_completeness": completeness
        }
    except Exception as e:
        logger.error("Failed to import FHIR patient", patient_id=patient_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve or map FHIR patient record: {str(e)}"
        )


@router.get("/search", status_code=status.HTTP_200_OK)
async def search_patients_fhir(
    name: Optional[str] = Query(default=None, description="Patient name to search"),
    dob: Optional[str] = Query(default=None, description="Patient date of birth (YYYY-MM-DD)"),
    current_staff: TokenData = Depends(get_current_staff)
):
    """
    Search patients by name and/or DOB on the public HAPI FHIR R4 server.
    """
    logger.info("Received request to search FHIR patients", name=name, dob=dob, staff_id=current_staff.staff_id)
    if not name and not dob:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least name or dob search query parameters must be provided."
        )

    try:
        results = await fhir_import_client.search_patients(name=name, dob=dob)
        return results
    except Exception as e:
        logger.error("Failed to search FHIR patients", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to query FHIR patient search: {str(e)}"
        )
