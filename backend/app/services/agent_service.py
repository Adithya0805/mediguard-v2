from datetime import datetime
from uuid import UUID, uuid4
from typing import List, Optional
from supabase import Client
from app.db.models import AgentRun
from app.services.audit_service import AuditService
from app.utils.logger import get_logger
from app.utils.exceptions import DatabaseException

logger = get_logger("app.services.agent_service")


class AgentTrackingService:
    """Orchestrates tracking specific agent executions, started states, and completion status records."""
    
    def __init__(self, db: Client, audit: AuditService):
        self.db = db
        self.audit = audit

    async def start_agent_run(
        self,
        session_id: UUID,
        agent_name: str,
        input_summary: str
    ) -> UUID:
        """Logs the start of a specialist agent run, returning a new execution UUID."""
        run_id = uuid4()
        started_at = datetime.utcnow().isoformat()
        
        db_payload = {
            "id": str(run_id),
            "session_id": str(session_id),
            "agent_name": agent_name,
            "started_at": started_at,
            "status": "running",
            "input_summary": input_summary
        }
        
        logger.info("Tracking agent run started...", run_id=run_id, agent_name=agent_name, session_id=session_id)
        
        try:
            response = self.db.table("agent_runs").insert(db_payload).execute()
            if not response.data:
                raise DatabaseException("Supabase insert did not return agent run data.")
                
            await self.audit.log_action(
                action="agent_started",
                actor=agent_name,
                session_id=session_id,
                metadata={"agent_run_id": str(run_id)}
            )
            
            return run_id
            
        except Exception as e:
            logger.error("Failed to insert agent run tracking state", run_id=run_id, error=str(e))
            raise DatabaseException(f"Failed to log agent run: {str(e)}")

    async def complete_agent_run(
        self,
        agent_run_id: UUID,
        output_summary: str,
        tokens_used: int = 0
    ) -> None:
        """Updates agent run log state as successful with output and token metrics."""
        completed_at = datetime.utcnow().isoformat()
        logger.info("Tracking agent run complete...", run_id=agent_run_id, tokens_used=tokens_used)
        
        try:
            # Query session_id first for the audit trail logging context
            run_data = self.db.table("agent_runs").select("session_id, agent_name").eq("id", str(agent_run_id)).execute()
            session_id = None
            agent_name = "unknown"
            if run_data.data:
                session_id = UUID(run_data.data[0]["session_id"])
                agent_name = run_data.data[0]["agent_name"]
                
            response = self.db.table("agent_runs")\
                .update({
                    "status": "success",
                    "completed_at": completed_at,
                    "output_summary": output_summary,
                    "tokens_used": tokens_used
                })\
                .eq("id", str(agent_run_id))\
                .execute()
                
            if not response.data:
                raise DatabaseException(f"Agent run '{agent_run_id}' not found to update complete status.")
                
            await self.audit.log_action(
                action="agent_completed",
                actor=agent_name,
                session_id=session_id,
                metadata={"agent_run_id": str(agent_run_id), "tokens_used": tokens_used}
            )
            
        except Exception as e:
            logger.error("Failed to complete agent run tracking update", run_id=agent_run_id, error=str(e))
            raise DatabaseException(f"Failed to update agent run success state: {str(e)}")

    async def fail_agent_run(
        self,
        agent_run_id: UUID,
        error_message: str
    ) -> None:
        """Marks agent run log state as failed with clean exception error outputs."""
        completed_at = datetime.utcnow().isoformat()
        logger.warning("Tracking agent run failed...", run_id=agent_run_id, error=error_message)
        
        try:
            # Query session_id first for the audit trail logging context
            run_data = self.db.table("agent_runs").select("session_id, agent_name").eq("id", str(agent_run_id)).execute()
            session_id = None
            agent_name = "unknown"
            if run_data.data:
                session_id = UUID(run_data.data[0]["session_id"])
                agent_name = run_data.data[0]["agent_name"]
                
            response = self.db.table("agent_runs")\
                .update({
                    "status": "failed",
                    "completed_at": completed_at,
                    "error_message": error_message
                })\
                .eq("id", str(agent_run_id))\
                .execute()
                
            if not response.data:
                raise DatabaseException(f"Agent run '{agent_run_id}' not found to update fail status.")
                
            await self.audit.log_action(
                action="agent_failed",
                actor=agent_name,
                session_id=session_id,
                metadata={"agent_run_id": str(agent_run_id), "error": error_message}
            )
            
        except Exception as e:
            logger.error("Failed to update agent run fail state log", run_id=agent_run_id, error=str(e))
            raise DatabaseException(f"Failed to update agent run fail state: {str(e)}")

    async def get_session_agent_runs(self, session_id: UUID) -> List[AgentRun]:
        """Queries and returns all tracking records associated with the patient session."""
        logger.info("Retrieving runs trace for session...", session_id=session_id)
        try:
            response = self.db.table("agent_runs")\
                .select("*")\
                .eq("session_id", str(session_id))\
                .order("started_at", desc=False)\
                .execute()
                
            runs = []
            for row in (response.data or []):
                runs.append(AgentRun(**row))
            return runs
        except Exception as e:
            logger.error("Failed to retrieve session agent runs trace list", session_id=session_id, error=str(e))
            raise DatabaseException(f"Failed to list agent execution traces: {str(e)}")
