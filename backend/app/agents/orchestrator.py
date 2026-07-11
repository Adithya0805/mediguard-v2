"""
MediGuard V2 — LangGraph Orchestrator
Supervisor pattern: wires all 5 specialist agents into a directed state graph.

Graph topology:
  START
    └─► intake
           └─► symptom
                  └─► [conditional_route_after_symptom]
                           ├─► (urgency == critical) ─► report
                           └─► (otherwise)           ─► diagnosis
                                                              └─► drug_check
                                                                      └─► report
                                                                              └─► END

The conditional edge after the symptom node is the safety gate of the entire
pipeline: if the symptom agent detects a critical/emergency condition, the
pipeline fast-tracks directly to report generation, skipping full DDx
calculation, so the physician is alerted immediately.
"""
from datetime import datetime, timezone
from typing import Any, Dict
import asyncio

from langgraph.graph import StateGraph, START, END

from app.agents.diagnosis_agent import DiagnosisAgent
from app.agents.drug_agent import DrugAgent
from app.agents.intake_agent import IntakeAgent
from app.agents.report_agent import ReportAgent
from app.agents.symptom_agent import SymptomAgent
from app.llm.router import LLMRouter
from app.rag.retriever import MedicalRetriever
from app.schemas.agent import AgentState, build_initial_state
from app.utils.logger import get_logger
from app.utils.metrics import metrics
from app.utils.exceptions import AgentExecutionException as AgentExecutionError
from app.utils.websocket_manager import ws_manager
from app.schemas.websocket import AgentEvent, AgentEventType

logger = get_logger("app.agents.orchestrator")


class MediGuardOrchestrator:
    """
    LangGraph Supervisor Orchestrator for MediGuard V2.

    Manages all specialist agent instances, builds and compiles the clinical
    state graph, and exposes run_pipeline() for external callers.
    """

    def __init__(self):
        logger.info("Initialising MediGuardOrchestrator...")

        # ── Shared infrastructure ────────────────────────────────────────────
        self.llm_router = LLMRouter()
        self.retriever  = MedicalRetriever()

        # ── Specialist agents ────────────────────────────────────────────────
        self.intake_agent    = IntakeAgent(self.llm_router, self.retriever)
        self.symptom_agent   = SymptomAgent(self.llm_router, self.retriever)
        self.diagnosis_agent = DiagnosisAgent(self.llm_router, self.retriever)
        self.drug_agent      = DrugAgent(self.llm_router, self.retriever)
        self.report_agent    = ReportAgent(self.llm_router, self.retriever)

        # ── Build and compile the LangGraph ──────────────────────────────────
        self.graph = self._build_graph()

        logger.info(
            "MediGuardOrchestrator ready",
            nodes=["intake", "symptom", "diagnosis", "drug_check", "report"],
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Graph construction
    # ─────────────────────────────────────────────────────────────────────────

    def _build_graph(self):
        """
        Build the LangGraph StateGraph with all clinical nodes and edges.

        Returns:
            Compiled LangGraph ready for invocation.
        """
        builder = StateGraph(AgentState)

        # ── Register agent nodes ─────────────────────────────────────────────
        builder.add_node("intake",     self.intake_agent.run)
        builder.add_node("symptom",    self.symptom_agent.run)
        builder.add_node("diagnosis",  self.diagnosis_agent.run)
        builder.add_node("drug_check", self.drug_agent.run)
        builder.add_node("report",     self.report_agent.run)

        # ── Define edges ─────────────────────────────────────────────────────
        builder.add_edge(START,        "intake")
        builder.add_edge("intake",     "symptom")

        # Conditional safety gate after symptom analysis
        builder.add_conditional_edges(
            "symptom",
            _conditional_route_after_symptom,
            {
                "diagnosis":  "diagnosis",
                "report":     "report",     # fast-track on critical emergency
            },
        )

        builder.add_edge("diagnosis",  "drug_check")
        builder.add_edge("drug_check", "report")
        builder.add_edge("report",     END)

        compiled = builder.compile()
        logger.info("LangGraph clinical pipeline compiled successfully")
        return compiled

    # ─────────────────────────────────────────────────────────────────────────
    # Public pipeline entry point
    # ─────────────────────────────────────────────────────────────────────────

    async def run_pipeline(
        self,
        session_id: str,
        patient_data: Dict[str, Any],
    ) -> AgentState:
        """
        Run the full clinical CDSS pipeline for a patient session.

        Args:
            session_id:   UUID string of the patient session in Supabase.
            patient_data: Dict representation of the PatientInput payload.

        Returns:
            Final AgentState after all agents have completed.
        """
        logger.info(
            "Starting clinical pipeline",
            session_id=session_id,
            chief_complaint=patient_data.get("chief_complaint", "unknown"),
        )

        # Build safe initial state
        initial_state = build_initial_state(session_id, patient_data)

        # Record pipeline start in metrics
        metrics.record_pipeline_start()
        pipeline_start = __import__('time').monotonic()

        # Broadcast pipeline started
        try:
            await ws_manager.broadcast_to_session(
                session_id,
                AgentEvent(
                    event_type=AgentEventType.PIPELINE_STARTED,
                    session_id=session_id,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    message="MediGuard AI pipeline initiated",
                    data={
                        "total_agents": 5,
                        "agents_sequence": [
                            "intake", "symptom",
                            "diagnosis", "drug_check", "report"
                        ]
                    }
                )
            )
        except Exception as ws_err:
            logger.warning("Failed to broadcast pipeline_started event", session_id=session_id, error=str(ws_err))

        try:
            # Invoke the compiled graph with a 120s timeout safety net
            final_state = await asyncio.wait_for(
                self.graph.ainvoke(initial_state),
                timeout=120.0,
            )

            duration = _calculate_duration(initial_state["pipeline_start_time"])
            wall_duration = round(__import__('time').monotonic() - pipeline_start, 2)

            # Record completion metrics
            metrics.record_pipeline_complete(wall_duration)

            logger.info(
                "Clinical pipeline completed successfully",
                session_id=session_id,
                completed_agents=final_state.get("completed_agents", []),
                urgency=final_state.get("urgency_level"),
                report_generated=final_state.get("report_generated"),
                duration_seconds=duration,
            )

            # Broadcast pipeline completed
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.PIPELINE_COMPLETED,
                        session_id=session_id,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        message="Clinical analysis complete. Report ready.",
                        data={
                            "total_duration_seconds": duration,
                            "urgency_level": final_state.get("urgency_level", "medium"),
                            "primary_diagnosis": final_state.get("primary_diagnosis", {}).get("diagnosis", ""),
                            "ddx_count": len(final_state.get("differential_diagnosis", [])),
                            "report_generated": True
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast pipeline_completed event", session_id=session_id, error=str(ws_err))

            return final_state

        except asyncio.TimeoutError:
            wall_duration = round(__import__('time').monotonic() - pipeline_start, 2)
            metrics.record_pipeline_failure(wall_duration)
            metrics.record_agent_error("orchestrator")
            logger.error(
                "Clinical pipeline TIMED OUT after 120 seconds",
                session_id=session_id,
                duration_seconds=wall_duration,
            )
            # Build safe timeout failure state
            failure_state = dict(initial_state)
            failure_state["agent_errors"] = [{
                "agent":     "orchestrator",
                "error":     "Pipeline timeout after 120 seconds",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }]
            failure_state["pipeline_end_time"] = datetime.now(timezone.utc).isoformat()
            failure_state["urgency_level"]     = "high"  # safety default on timeout

            # Broadcast pipeline failed
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.PIPELINE_FAILED,
                        session_id=session_id,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        message="Pipeline encountered an error: Timeout",
                        data={"error": "Pipeline timeout after 120 seconds"}
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast pipeline_failed event", session_id=session_id, error=str(ws_err))

            raise AgentExecutionError("Clinical pipeline timeout after 120 seconds")

        except Exception as exc:
            wall_duration = round(__import__('time').monotonic() - pipeline_start, 2)
            metrics.record_pipeline_failure(wall_duration)
            metrics.record_agent_error("orchestrator")
            logger.error(
                "Clinical pipeline raised unhandled exception",
                session_id=session_id,
                error=str(exc),
            )
            # Build a partial failure state for persistence
            failure_state = dict(initial_state)
            failure_state["agent_errors"] = [
                {
                    "agent":     "orchestrator",
                    "error":     str(exc),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ]
            failure_state["pipeline_end_time"] = datetime.now(timezone.utc).isoformat()
            failure_state["urgency_level"]     = "high"   # safety default

            # Broadcast pipeline failed
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.PIPELINE_FAILED,
                        session_id=session_id,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        message=f"Pipeline encountered an error: {str(exc)}",
                        data={"error": str(exc)}
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast pipeline_failed event", session_id=session_id, error=str(ws_err))

            raise


# ── Conditional routing function ──────────────────────────────────────────────

def _conditional_route_after_symptom(state: AgentState) -> str:
    """
    Safety gate: decides whether to fast-track to report (emergency) or
    proceed through the full diagnosis → drug_check → report pipeline.

    Args:
        state: Current AgentState after symptom agent completes.

    Returns:
        "report"    — if urgency_level is "critical" (emergency bypass)
        "diagnosis" — for all other urgency levels
    """
    urgency = state.get("urgency_level", "medium")

    if urgency == "critical":
        logger.warning(
            "EMERGENCY GATE TRIGGERED — bypassing full DDx pipeline",
            session_id=state.get("session_id", "unknown"),
            urgency=urgency,
        )
        return "report"

    logger.info(
        "Routing to diagnosis",
        session_id=state.get("session_id", "unknown"),
        urgency=urgency,
    )
    return "diagnosis"


# ── Utility ───────────────────────────────────────────────────────────────────

def _calculate_duration(pipeline_start_time: str) -> float:
    """Calculate total pipeline duration in seconds."""
    try:
        start = datetime.fromisoformat(pipeline_start_time.replace("Z", "+00:00"))
        return round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    except Exception:
        return 0.0


# ── Module-level singleton ────────────────────────────────────────────────────
orchestrator = MediGuardOrchestrator()
