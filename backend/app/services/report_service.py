from datetime import datetime
from uuid import UUID, uuid4
from typing import Dict, Any
from supabase import Client
from app.db.models import ClinicalReport
from app.services.audit_service import AuditService
from app.utils.logger import get_logger
from app.utils.exceptions import ReportGenerationException, SessionNotFoundException, ValidationException

logger = get_logger("app.services.report_service")


class ReportService:
    """Manages creation, parsing, validation, and retrieval of generated ClinicalReports."""
    
    def __init__(self, db: Client, audit: AuditService):
        self.db = db
        self.audit = audit

    async def save_report(self, session_id: UUID, report_data: Dict[str, Any]) -> ClinicalReport:
        """Validates report dict payloads and inserts new ClinicalReport database rows."""
        # 1. Validate required clinical report keys
        required_keys = [
            "differential_diagnosis",
            "recommended_tests",
            "drug_interactions_found",
            "clinical_summary",
            "urgency_level",
            "reviewed_by_agent"
        ]
        
        missing_keys = [key for key in required_keys if key not in report_data]
        if missing_keys:
            raise ValidationException(f"Clinical report payload is missing required fields: {missing_keys}")
            
        report_id = uuid4()
        created_at = datetime.utcnow().isoformat()
        
        # Build structure matching database model schema
        db_payload = {
            "id": str(report_id),
            "session_id": str(session_id),
            "created_at": created_at,
            "differential_diagnosis": report_data["differential_diagnosis"],
            "recommended_tests": report_data["recommended_tests"],
            "drug_interactions_found": report_data["drug_interactions_found"],
            "clinical_summary": report_data["clinical_summary"],
            "urgency_level": report_data["urgency_level"],
            "report_pdf_url": report_data.get("report_pdf_url"),
            "fhir_bundle": report_data.get("fhir_bundle", {}),
            "reviewed_by_agent": report_data["reviewed_by_agent"]
        }
        
        logger.info("Persisting newly generated clinical report...", report_id=report_id, session_id=session_id)
        
        try:
            response = self.db.table("clinical_reports").insert(db_payload).execute()
            if not response.data:
                raise ReportGenerationException("Supabase insert did not return clinical report row data.")
                
            await self.audit.log_action(
                action="report_saved",
                actor="system",
                session_id=session_id,
                metadata={"report_id": str(report_id)}
            )
            
            return ClinicalReport(**response.data[0])
            
        except Exception as e:
            logger.error("DB clinical report insert failure", session_id=session_id, error=str(e))
            raise ReportGenerationException(f"Failed to persist clinical report record: {str(e)}")

    async def get_report(self, session_id: UUID) -> ClinicalReport:
        """Queries the database for a completed report associated with the patient session."""
        logger.info("Retrieving clinical report record", session_id=session_id)
        try:
            response = self.db.table("clinical_reports")\
                .select("*")\
                .eq("session_id", str(session_id))\
                .execute()
                
            if not response.data:
                logger.warning("Clinical report not found in database for session", session_id=session_id)
                raise SessionNotFoundException(f"Clinical report for session '{session_id}' has not been generated yet.")
                
            await self.audit.log_action(
                action="report_retrieved",
                actor="system",
                session_id=session_id
            )
            
            return ClinicalReport(**response.data[0])
            
        except SessionNotFoundException:
            raise
        except Exception as e:
            logger.error("Database query lookup failure for report", session_id=session_id, error=str(e))
            raise ReportGenerationException(f"Failed to query clinical report: {str(e)}")

    async def update_report_pdf_url(self, session_id: UUID, pdf_url: str) -> None:
        """Attaches a secure PDF binary storage link url to the clinical report row."""
        logger.info("Attaching secure PDF download URL", session_id=session_id, pdf_url=pdf_url)
        try:
            response = self.db.table("clinical_reports")\
                .update({"report_pdf_url": pdf_url})\
                .eq("session_id", str(session_id))\
                .execute()
                
            if not response.data:
                raise SessionNotFoundException(f"Report for session '{session_id}' not found to attach PDF url.")
                
            await self.audit.log_action(
                action="report_pdf_attached",
                actor="system",
                session_id=session_id,
                metadata={"pdf_url": pdf_url}
            )
        except Exception as e:
            logger.error("Failed to update clinical report PDF url link", session_id=session_id, error=str(e))
            raise ReportGenerationException(f"Failed to attach report PDF url: {str(e)}")
