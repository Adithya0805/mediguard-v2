from uuid import UUID
from fastapi import APIRouter, Depends, Query, status, HTTPException
from supabase import Client
from app.dependencies import get_db, get_current_staff, TokenData
from app.schemas.patient import PatientInput, PatientSessionResponse
from app.services.patient_service import PatientService
from app.services.audit_service import AuditService
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.patient")
router = APIRouter()


@router.post("/session", response_model=PatientSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    patient_data: PatientInput,
    db: Client = Depends(get_db),
    current_staff: TokenData = Depends(get_current_staff)
):
    """Initiates a patient session, validating inputs, binding it to the institution, and persisting in Supabase."""
    logger.info("Handling POST session request", patient_name=patient_data.patient_name, staff_id=current_staff.staff_id)
    
    # Instantiate services
    audit_service = AuditService(db)
    patient_service = PatientService(db, audit_service)
    
    # Execute intake business logic passing the clinician's email and institution_id
    session = await patient_service.create_session(
        patient_input=patient_data,
        actor=current_staff.staff_id,
        institution_id=current_staff.institution_id
    )
    
    return PatientSessionResponse(
        session_id=session.id,
        status=session.status,
        created_at=session.created_at,
        message="Session created. Processing will begin shortly."
    )


@router.get("/session/{session_id}", status_code=status.HTTP_200_OK)
async def get_session(
    session_id: UUID,
    db: Client = Depends(get_db),
    current_staff: TokenData = Depends(get_current_staff)
):
    """Fetches details of an active clinical session from database, enforcing institutional boundary rules."""
    logger.info("Handling GET session request", session_id=session_id, staff_id=current_staff.staff_id)
    
    audit_service = AuditService(db)
    patient_service = PatientService(db, audit_service)
    
    session = await patient_service.get_session(session_id, actor=current_staff.staff_id)
    
    # Strictly enforce that the session belongs to the clinician's institution
    if session.institution_id and str(session.institution_id) != str(current_staff.institution_id):
        logger.warning(
            "Unauthorized patient session access attempt blocked",
            session_id=session_id,
            staff_id=current_staff.staff_id,
            staff_institution=current_staff.institution_id,
            session_institution=session.institution_id
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient record belongs to a different institution."
        )
        
    return session


@router.get("/sessions", status_code=status.HTTP_200_OK)
async def list_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Client = Depends(get_db),
    current_staff: TokenData = Depends(get_current_staff)
):
    """Retrieves paginated historical clinical sessions filtered by the clinician's institution."""
    logger.info("Handling GET paginated sessions list request", limit=limit, offset=offset, staff_id=current_staff.staff_id)
    
    audit_service = AuditService(db)
    patient_service = PatientService(db, audit_service)
    
    sessions = await patient_service.list_sessions(
        limit=limit,
        offset=offset,
        institution_id=current_staff.institution_id
    )
    return {
        "count": len(sessions),
        "limit": limit,
        "offset": offset,
        "results": sessions
    }
