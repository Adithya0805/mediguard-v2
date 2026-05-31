from typing import List, Dict, Any, Optional
from uuid import UUID
from supabase import Client
from app.utils.logger import get_logger

logger = get_logger("app.services.audit_service")


class AuditService:
    """Dedicated service for inserting and retrieving HIPAA-traceable clinical system audit logs."""
    
    def __init__(self, db: Client):
        self.db = db

    async def log_action(
        self,
        action: str,
        actor: str,
        session_id: Optional[UUID] = None,
        metadata: Dict[str, Any] = None
    ) -> None:
        """Inserts an audit record row. Never raises exceptions to maintain business flow continuity."""
        meta = metadata or {}
        try:
            payload = {
                "action": action,
                "actor": actor,
                "metadata": meta
            }
            if session_id:
                payload["session_id"] = str(session_id)
                
            logger.info("Writing audit log entry", action=action, actor=actor, session_id=session_id)
            
            # Insert to Supabase audit_logs table
            self.db.table("audit_logs").insert(payload).execute()
            
        except Exception as e:
            # Captures and logs audit database failures securely without breaking clinical workflow pipelines
            logger.error("AUDIT LOG INSERT FAILURE", action=action, error=str(e))

    async def get_session_audit_trail(self, session_id: UUID) -> List[Dict[str, Any]]:
        """Returns all audit log entries registered under a specific session ordered by timestamp."""
        try:
            logger.info("Retrieving session audit trail logs", session_id=session_id)
            response = self.db.table("audit_logs")\
                .select("*")\
                .eq("session_id", str(session_id))\
                .order("created_at", desc=False)\
                .execute()
                
            return response.data or []
        except Exception as e:
            logger.error("Failed to query audit trail records for session", session_id=session_id, error=str(e))
            return []
