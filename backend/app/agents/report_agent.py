"""
MediGuard V2 — Clinical Report Generator Agent
Fifth and final agent in the LangGraph pipeline.

Responsibility:
  Synthesise all prior agent outputs into a final structured clinical decision
  support report, ready for physician review and database persistence.

LLM used: get_llm() — Claude Sonnet (balanced depth for report narrative)
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict

from langchain_core.messages import HumanMessage, SystemMessage

from app.llm.router import LLMRouter
from app.rag.retriever import MedicalRetriever
from app.schemas.agent import AgentState
from app.utils.logger import get_logger
from app.utils.websocket_manager import ws_manager
from app.schemas.websocket import AgentEvent, AgentEventType

logger = get_logger("app.agents.report_agent")

# ── System prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are a clinical documentation AI. Synthesise the multi-agent analysis "
    "into a comprehensive, professional clinical decision support report. "
    "Write for a physician audience. Be precise, evidence-based, and clinically "
    "actionable. Only state clinical claims directly supported by the RAG context and agent findings. "
    "Use bracketed citations like [1] or [2] to reference literature sources. "
    "Respond only in valid JSON."
)

# ── User prompt template ──────────────────────────────────────────────────────
_USER_PROMPT_TEMPLATE = """\
Generate the final clinical report from this analysis.

Patient: {patient_summary}
Symptoms analysis: {symptoms_analysis}
Differential diagnosis: {differential_diagnosis}
Primary diagnosis: {primary_diagnosis}
Drug interactions: {drug_interactions}
Urgency: {urgency_level}
Sources: {context_sources}

Return a JSON object with:
{{
  "executive_summary": "3-4 sentence summary for physician (include bracketed citations like [1] where appropriate)",
  "clinical_narrative": "full clinical narrative paragraph (must include bracketed citations like [1] or [2] referencing the medical literature)",
  "primary_impression": "primary diagnosis with confidence",
  "differential_summary": "ranked DDx summary paragraph (must include bracketed citations like [1] or [2])",
  "recommended_workup": ["ordered list of recommended tests"],
  "medication_notes": "summary of drug interaction findings (include citations like [1] for drug labels if applicable)",
  "urgency_assessment": "clinical justification of urgency level",
  "disposition_recommendation": "discharge / admit / urgent referral / etc",
  "follow_up_instructions": ["list of follow-up actions"],
  "clinical_disclaimers": [
    "This report is AI-generated clinical decision support only.",
    "All recommendations must be reviewed by a licensed physician.",
    "This system does not replace clinical judgment."
  ],
  "report_metadata": {{
    "agents_used": [],
    "generation_time_seconds": 0,
    "model_used": "",
    "rag_sources_count": 0
  }},
  "citations": {{
    "1": {{
      "pmid": "PMID of first cited article",
      "title": "Title of first cited article",
      "url": "PubMed URL of first cited article"
    }}
  }}
}}
"""


class ReportAgent:
    """
    Final specialist agent that gathers all pipeline outputs and synthesises
    them into a comprehensive, physician-ready clinical decision support report.
    """

    def __init__(self, llm_router: LLMRouter, retriever: MedicalRetriever):
        self.llm_router = llm_router
        self.retriever  = retriever
        logger.info("ReportAgent initialised")

    async def run(self, state: AgentState) -> AgentState:
        """
        Synthesise all agent outputs into a final clinical report.

        Args:
            state: Current shared AgentState (all prior agents completed).

        Returns:
            Updated AgentState with report, report_generated, and
            pipeline_end_time set.
        """
        session_id           = state.get("session_id", "unknown")
        parsed_intake        = state.get("parsed_intake", {})
        symptoms_analysis    = state.get("symptoms_analysis", {})
        differential_diagnosis = state.get("differential_diagnosis", [])
        primary_diagnosis    = state.get("primary_diagnosis", {})
        drug_interactions    = state.get("drug_interactions", [])
        urgency_level        = state.get("urgency_level", "medium")
        context_sources      = state.get("context_sources", [])
        completed_agents     = state.get("completed_agents", [])
        pipeline_start_time  = state.get("pipeline_start_time", "")

        logger.info(
            "ReportAgent starting — synthesising final report",
            session_id=session_id,
            completed_agents=completed_agents,
            urgency=urgency_level,
        )

        # Broadcast start event
        try:
            await ws_manager.broadcast_to_session(
                session_id,
                AgentEvent(
                    event_type=AgentEventType.AGENT_STARTED,
                    session_id=session_id,
                    agent_name="report",
                    timestamp=datetime.utcnow().isoformat(),
                    message="Report Agent is compiling report...",
                    data={
                        "agent_display_name": "Report Agent",
                        "agent_icon": "file-text",
                        "estimated_seconds": 15
                    }
                )
            )
        except Exception as ws_err:
            logger.warning("Failed to broadcast agent_started event via websocket", session_id=session_id, error=str(ws_err))

        agent_start_time = datetime.utcnow()

        # ── Calculate generation time ─────────────────────────────────────────
        generation_seconds = _calculate_generation_time(pipeline_start_time)

        try:
            llm = self.llm_router.route("report")

            user_content = _USER_PROMPT_TEMPLATE.format(
                patient_summary        = parsed_intake.get("patient_summary", "Unknown patient"),
                symptoms_analysis      = json.dumps(symptoms_analysis, indent=2),
                differential_diagnosis = json.dumps(differential_diagnosis, indent=2),
                primary_diagnosis      = json.dumps(primary_diagnosis, indent=2),
                drug_interactions      = json.dumps(drug_interactions, indent=2),
                urgency_level          = urgency_level,
                context_sources        = json.dumps(context_sources),
            )

            messages = [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=user_content),
            ]

            logger.info("ReportAgent invoking LLM", session_id=session_id)
            response = await llm.ainvoke(messages)
            
            if hasattr(response, "content"):
                content = response.content
                if isinstance(content, list):
                    raw_text = "".join(
                        block.get("text", "") if isinstance(block, dict) and block.get("type") == "text"
                        else (block if isinstance(block, str) else "")
                        for block in content
                    )
                else:
                    raw_text = str(content)
            else:
                raw_text = str(response)

            parsed = _safe_parse_json(raw_text, agent_name="report")
            if parsed is None:
                raise ValueError("LLM returned unparseable JSON for report generation")

            # Fill in report_metadata with accurate orchestration values
            report_metadata = parsed.get("report_metadata", {})
            report_metadata["agents_used"]            = completed_agents + ["report"]
            report_metadata["generation_time_seconds"] = generation_seconds
            report_metadata["model_used"]              = "claude-3-sonnet"
            report_metadata["rag_sources_count"]       = len(context_sources)
            parsed["report_metadata"] = report_metadata

            state["report"]           = parsed
            state["report_generated"] = True

            logger.info(
                "ReportAgent completed — final report generated",
                session_id=session_id,
                generation_seconds=generation_seconds,
                rag_sources=len(context_sources),
            )

            # Broadcast completed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_COMPLETED,
                        session_id=session_id,
                        agent_name="report",
                        timestamp=datetime.utcnow().isoformat(),
                        message="Report Agent completed",
                        data={
                            "duration_seconds": duration,
                            "urgency_level": state.get("urgency_level", "medium")
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast agent_completed event via websocket", session_id=session_id, error=str(ws_err))

        except Exception as exc:
            logger.error("ReportAgent failed", session_id=session_id, error=str(exc))

            error_record = _build_error_record("report", str(exc))
            state["agent_errors"] = state.get("agent_errors", []) + [error_record]

            # Fallback report — enough for persistence and audit
            state["report"]           = _build_fallback_report(
                session_id, parsed_intake, urgency_level, completed_agents, generation_seconds
            )
            state["report_generated"] = True   # mark True — partial report is still a report

            # Broadcast failed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_FAILED,
                        session_id=session_id,
                        agent_name="report",
                        timestamp=datetime.utcnow().isoformat(),
                        message=f"Report Agent failed: {str(exc)}",
                        data={
                            "duration_seconds": duration,
                            "error": str(exc)
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast agent_failed event via websocket", session_id=session_id, error=str(ws_err))

        # ── Update orchestration metadata ────────────────────────────────────
        end_time = datetime.now(timezone.utc).isoformat()

        completed = list(state.get("completed_agents", []))
        completed.append("report")
        state["completed_agents"]   = completed
        state["current_agent"]      = "done"
        state["pipeline_end_time"]  = end_time

        return state


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calculate_generation_time(pipeline_start_time: str) -> float:
    """Calculate elapsed seconds since pipeline start."""
    try:
        if not pipeline_start_time:
            return 0.0
        start = datetime.fromisoformat(pipeline_start_time.replace("Z", "+00:00"))
        now   = datetime.now(timezone.utc)
        return round((now - start).total_seconds(), 2)
    except Exception:
        return 0.0


def _safe_parse_json(raw: str, agent_name: str) -> Dict[str, Any] | None:
    text = raw.strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end   = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
    logger.error("JSON parse failed", agent=agent_name)
    return None


def _build_error_record(agent_name: str, error_message: str) -> Dict[str, Any]:
    return {
        "agent":     agent_name,
        "error":     error_message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _build_fallback_report(
    session_id: str,
    parsed_intake: Dict[str, Any],
    urgency_level: str,
    completed_agents: list,
    generation_seconds: float,
) -> Dict[str, Any]:
    """Minimal fallback clinical report when LLM synthesis fails."""
    return {
        "executive_summary":        "Automated report synthesis failed. Immediate physician review required.",
        "clinical_narrative":       parsed_intake.get("patient_summary", "Patient details unavailable."),
        "primary_impression":       "Unable to determine — physician assessment required",
        "differential_summary":     "Differential diagnosis generation encountered an error. Clinical evaluation needed.",
        "recommended_workup":       ["Immediate physician evaluation", "Complete physical examination"],
        "medication_notes":         "Medication review could not be completed. Pharmacist review required.",
        "urgency_assessment":       f"Urgency set to '{urgency_level}' by automated triage.",
        "disposition_recommendation": "Physician evaluation required before disposition decision.",
        "follow_up_instructions":   ["Immediate physician review of this case"],
        "clinical_disclaimers":     [
            "This report is AI-generated clinical decision support only.",
            "All recommendations must be reviewed by a licensed physician.",
            "This system does not replace clinical judgment.",
            "ALERT: Report generation encountered an error — use with extreme caution.",
        ],
        "report_metadata": {
            "agents_used":             completed_agents,
            "generation_time_seconds": generation_seconds,
            "model_used":              "fallback",
            "rag_sources_count":       0,
        },
    }
