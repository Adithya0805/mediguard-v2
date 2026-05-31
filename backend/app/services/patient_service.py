from datetime import datetime
from uuid import UUID, uuid4
from typing import List
from supabase import Client
from app.db.models import PatientSession
from app.schemas.patient import PatientInput
from app.services.audit_service import AuditService
from app.utils.logger import get_logger
from app.utils.exceptions import DatabaseException, SessionNotFoundException, ValidationException

logger = get_logger("app.services.patient_service")


class PatientService:
    """Manages raw patient clinical intakes, session status modifications, and session database lookups."""
    
    def __init__(self, db: Client, audit: AuditService):
        self.db = db
        self.audit = audit

    async def create_session(self, patient_input: PatientInput, actor: str = "system") -> PatientSession:
        """Constructs a new clinical intake tracking session record in the DB."""
        session_id = uuid4()
        created_at = datetime.utcnow().isoformat()
        
        # Build structure matching database model schema
        session_data = {
            "id": str(session_id),
            "created_at": created_at,
            "patient_name": patient_input.patient_name,
            "patient_age": patient_input.patient_age,
            "patient_gender": patient_input.patient_gender,
            "chief_complaint": patient_input.chief_complaint,
            "symptoms": patient_input.symptoms,
            "medical_history": patient_input.medical_history,
            "current_medications": patient_input.current_medications,
            "allergies": patient_input.allergies,
            "vitals": patient_input.vitals,
            "status": "pending"
        }
        
        logger.info(
            "Creating new patient session record",
            session_id=session_id,
            patient_age=patient_input.patient_age,
            symptom_count=len(patient_input.symptoms),
            actor=actor
        )
        
        try:
            # Insert into Supabase patient_sessions table
            response = self.db.table("patient_sessions").insert(session_data).execute()
            if not response.data:
                raise DatabaseException("Supabase insert did not return session row data.")
                
            # Log audit trail action
            await self.audit.log_action(
                action="session_created",
                actor=actor,
                session_id=session_id,
                metadata={
                    "patient_age": patient_input.patient_age,
                    "symptoms_count": len(patient_input.symptoms)
                }
            )
            
            return PatientSession(**response.data[0])
            
        except Exception as e:
            logger.error("DB create patient session insertion fail", session_id=session_id, error=str(e))
            raise DatabaseException(f"Failed to create patient session record: {str(e)}")

    async def get_session(self, session_id: UUID, actor: str = "system") -> PatientSession:
        """Retrieves a patient session from the database, raising 404 if not found."""
        logger.info("Querying patient session record", session_id=session_id, actor=actor)
        try:
            response = self.db.table("patient_sessions")\
                .select("*")\
                .eq("id", str(session_id))\
                .execute()
                
            if not response.data:
                logger.warning("Patient session not found in database", session_id=session_id)
                raise SessionNotFoundException(f"Clinical session with ID '{session_id}' does not exist.")
                
            await self.audit.log_action(
                action="session_retrieved",
                actor=actor,
                session_id=session_id
            )
            
            return PatientSession(**response.data[0])
            
        except SessionNotFoundException:
            raise
        except Exception as e:
            logger.error("Database query lookup failure", session_id=session_id, error=str(e))
            raise DatabaseException(f"Failed to lookup patient session: {str(e)}")

    async def update_session_status(self, session_id: UUID, status: str) -> None:
        """Updates the status workflow progression label of the session record."""
        valid_statuses = ["pending", "processing", "completed", "failed"]
        if status not in valid_statuses:
            raise ValidationException(f"Invalid workflow status '{status}'. Must be one of {valid_statuses}.")
            
        logger.info("Modifying patient session status", session_id=session_id, status=status)
        
        try:
            # Confirm session exists first
            await self.get_session(session_id)
            
            # Execute status patch update
            response = self.db.table("patient_sessions")\
                .update({"status": status})\
                .eq("id", str(session_id))\
                .execute()
                
            if not response.data:
                raise DatabaseException("Supabase status patch update did not return row data.")
                
            await self.audit.log_action(
                action="session_status_updated",
                actor="system",
                session_id=session_id,
                metadata={"new_status": status}
            )
            
        except Exception as e:
            logger.error("Database status update transaction fail", session_id=session_id, error=str(e))
            raise DatabaseException(f"Failed to update session status workflow labels: {str(e)}")

    async def list_sessions(self, limit: int = 20, offset: int = 0) -> List[PatientSession]:
        """Returns a paginated list of patient session history records ordered DESC by ingestion date."""
        logger.info("Listing paginated history records", limit=limit, offset=offset)
        try:
            response = self.db.table("patient_sessions")\
                .select("*")\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
                
            sessions = []
            for row in (response.data or []):
                sessions.append(PatientSession(**row))
            return sessions
        except Exception as e:
            logger.error("DB sessions paginated query fail", error=str(e))
            raise DatabaseException(f"Failed to list paginated session records: {str(e)}")
