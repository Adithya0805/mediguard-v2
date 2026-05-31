from datetime import datetime
from uuid import UUID
from typing import Dict, Any

from app.services.pdf_service import ClinicalPDFGenerator
from app.services.fhir_service import FHIRBundleGenerator
from app.services.audit_service import AuditService
from app.services.report_service import ReportService
from app.db.supabase_client import upload_pdf_to_storage
from app.utils.exceptions import ReportGenerationException
from app.utils.logger import get_logger

logger = get_logger("app.services.document_service")


class DocumentService:
    """Orchestrates PDF report generation, FHIR bundle compilation, and Supabase persistence."""

    def __init__(self, db: Any):
        self.db = db
        self.pdf_generator = ClinicalPDFGenerator()
        self.fhir_generator = FHIRBundleGenerator()
        self.audit_service = AuditService(db)
        self.report_service = ReportService(db, self.audit_service)

    async def generate_clinical_documents(
        self,
        session_id: str,
        report_data: Dict[str, Any],
        patient_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generates visual clinical PDF report and structured FHIR JSON bundle."""
        logger.info("Starting clinical document generation workflow...", session_id=session_id)
        
        try:
            session_uuid = UUID(session_id) if isinstance(session_id, str) else session_id
            session_str = str(session_id)
            
            # 1. Generate PDF bytes
            try:
                pdf_bytes = self.pdf_generator.generate_pdf(report_data, patient_data, session_str)
            except Exception as e:
                logger.error("PDF generator execution crashed", session_id=session_id, error=str(e))
                raise ReportGenerationException(f"Failed to generate clinical PDF: {str(e)}")

            # 2. Validate PDF bytes
            if not pdf_bytes or len(pdf_bytes) == 0:
                raise ReportGenerationException("Generated PDF byte stream is empty.")

            # 3. Upload PDF to Supabase Storage
            try:
                pdf_url = await upload_pdf_to_storage(pdf_bytes, session_str)
            except Exception as e:
                logger.error("PDF upload task failed", session_id=session_id, error=str(e))
                raise ReportGenerationException(f"Failed to upload clinical report PDF to storage: {str(e)}")

            # 4. Generate FHIR bundle
            try:
                fhir_bundle = self.fhir_generator.generate_bundle(report_data, patient_data, session_str)
            except Exception as e:
                logger.error("FHIR bundle generator execution crashed", session_id=session_id, error=str(e))
                raise ReportGenerationException(f"Failed to generate FHIR R4 bundle: {str(e)}")

            # 5. Validate FHIR bundle
            fhir_valid, fhir_issues = self.fhir_generator.validate_bundle(fhir_bundle)
            
            # 6. Log FHIR validation results (warning if invalid but don't fail clinical workflow)
            if not fhir_valid:
                logger.warning(
                    "FHIR R4 bundle compiled with validation issues",
                    session_id=session_id,
                    issues=fhir_issues
                )
            else:
                logger.info("FHIR R4 bundle successfully compiled and verified.", session_id=session_id)

            # 7. Update PDF URL in clinical_reports table via ReportService
            try:
                await self.report_service.update_report_pdf_url(session_uuid, pdf_url)
            except Exception as e:
                logger.error("Failed to associate PDF URL in clinical_reports row", session_id=session_id, error=str(e))
                raise ReportGenerationException(f"Failed to attach report PDF url link: {str(e)}")

            # 8. Update fhir_bundle column in clinical_reports table directly via Supabase query builder
            try:
                response = self.db.table("clinical_reports")\
                    .update({"fhir_bundle": fhir_bundle})\
                    .eq("session_id", session_str)\
                    .execute()
                
                if not response.data:
                    logger.warning("No clinical report row updated with FHIR bundle", session_id=session_id)
            except Exception as e:
                logger.error("Failed to persist FHIR bundle inside clinical_reports table", session_id=session_id, error=str(e))
                raise ReportGenerationException(f"Failed to attach FHIR bundle: {str(e)}")

            # 9. Log audit
            await self.audit_service.log_action(
                action="clinical_documents_generated",
                actor="system",
                session_id=session_uuid,
                metadata={
                    "pdf_url": pdf_url,
                    "pdf_size_bytes": len(pdf_bytes),
                    "fhir_valid": fhir_valid
                }
            )

            # 10. Return summary
            return {
                "pdf_url": pdf_url,
                "pdf_size_bytes": len(pdf_bytes),
                "fhir_valid": fhir_valid,
                "fhir_issues": fhir_issues,
                "generated_at": datetime.utcnow().isoformat() + "Z"
            }

        except ReportGenerationException:
            # Re-raise known structured app exceptions
            raise
        except Exception as e:
            logger.error("Unexpected failure compiling clinical output documents", session_id=session_id, error=str(e))
            raise ReportGenerationException(f"Unexpected document compilation failure: {str(e)}")
