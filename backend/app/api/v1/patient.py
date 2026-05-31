from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from supabase import Client
from app.dependencies import get_db, verify_clinical_auth
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
    actor: dict = Depends(verify_clinical_auth)
):
    """Initiates a patient session, validating inputs and persisting in Supabase."""
    logger.info("Handling POST session request", patient_name=patient_data.patient_name, actor=actor.get("username"))
    
    # Instantiate services
    audit_service = AuditService(db)
    patient_service = PatientService(db, audit_service)
    
    # Execute intake business logic passing the actor's identifier
    session = await patient_service.create_session(patient_data, actor=actor.get("username", "system"))
    
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
    actor: dict = Depends(verify_clinical_auth)
):
    """Fetches details of an active clinical session from database."""
    logger.info("Handling GET session request", session_id=session_id, actor=actor.get("username"))
    
    audit_service = AuditService(db)
    patient_service = PatientService(db, audit_service)
    
    session = await patient_service.get_session(session_id, actor=actor.get("username", "system"))
    return session


@router.get("/sessions", status_code=status.HTTP_200_OK)
async def list_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Client = Depends(get_db),
    actor: dict = Depends(verify_clinical_auth)
):
    """Retrieves paginated logs representing historical clinical sessions in database."""
    logger.info("Handling GET paginated sessions list request", limit=limit, offset=offset, actor=actor.get("username"))
    
    audit_service = AuditService(db)
    patient_service = PatientService(db, audit_service)
    
    sessions = await patient_service.list_sessions(limit=limit, offset=offset)
    return {
        "count": len(sessions),
        "limit": limit,
        "offset": offset,
        "results": sessions
    }
