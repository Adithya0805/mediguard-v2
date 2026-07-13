"""
MediGuard V2 — Symptom Analysis Agent
Second agent in the LangGraph pipeline.

Responsibility:
  Deep NLP analysis of symptoms — severity classification, body-system
  mapping, urgency triage, ICD-10 category suggestion.
  Also performs the first RAG retrieval pass to seed the medical context.

LLM used: get_llm() — Claude Sonnet (balanced depth + speed)
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage

from app.llm.router import LLMRouter
from app.rag.retriever import MedicalRetriever, format_context
from app.schemas.agent import AgentState
from app.utils.logger import get_logger
from app.utils.websocket_manager import ws_manager
from app.schemas.websocket import AgentEvent, AgentEventType

logger = get_logger("app.agents.symptom_agent")

# ── System prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are a clinical symptom analysis AI with expertise in internal medicine "
    "and emergency triage. Analyze symptoms using evidence-based medical knowledge. "
    "Respond only in valid JSON."
)

# ── User prompt template ──────────────────────────────────────────────────────
_USER_PROMPT_TEMPLATE = """\
Analyze these symptoms using the provided medical context.

Patient summary: {patient_summary}
Symptoms: {normalized_symptoms}
Red flags: {red_flags}
Medical context: {retrieved_context}

Return a JSON object with:
{{
  "severity": "mild | moderate | severe | critical",
  "body_systems_affected": ["list of body systems"],
  "symptom_clusters": [ {{"cluster_name": "", "symptoms": []}} ],
  "icd10_categories": ["suggested ICD-10 category codes with names"],
  "triage_recommendation": "immediate | urgent | semi-urgent | routine",
  "clinical_reasoning": "paragraph explaining the analysis",
  "requires_emergency": true/false
}}
"""


class SymptomAgent:
    """
    Specialist agent responsible for deep symptom NLP analysis, severity
    classification, and first-pass RAG retrieval for the medical knowledge base.
    """

    def __init__(self, llm_router: LLMRouter, retriever: MedicalRetriever):
        self.llm_router = llm_router
        self.retriever  = retriever
        logger.info("SymptomAgent initialised")

    async def run(self, state: AgentState) -> AgentState:
        """
        Analyse symptoms from parsed_intake, retrieve RAG context, and populate
        symptoms_analysis, symptom_severity, symptom_categories, and urgency
        signals.

        Args:
            state: Current shared AgentState.

        Returns:
            Updated AgentState with symptom analysis fields populated.
        """
        session_id    = state.get("session_id", "unknown")
        parsed_intake = state.get("parsed_intake", {})

        logger.info("SymptomAgent starting", session_id=session_id)

        # Broadcast start event
        try:
            await ws_manager.broadcast_to_session(
                session_id,
                AgentEvent(
                    event_type=AgentEventType.AGENT_STARTED,
                    session_id=session_id,
                    agent_name="symptom",
                    timestamp=datetime.utcnow().isoformat(),
                    message="Symptom Agent is analyzing...",
                    data={
                        "agent_display_name": "Symptom Agent",
                        "agent_icon": "activity",
                        "estimated_seconds": 12
                    }
                )
            )
        except Exception as ws_err:
            logger.warning("Failed to broadcast agent_started event via websocket", session_id=session_id, error=str(ws_err))

        agent_start_time = datetime.utcnow()

        # ── Step 1: RAG retrieval ─────────────────────────────────────────────
        chief_complaint      = state.get("patient_data", {}).get("chief_complaint", "")
        normalized_symptoms  = parsed_intake.get("normalized_symptoms", [])
        rag_query            = f"{chief_complaint} {' '.join(normalized_symptoms)}"

        logger.info("SymptomAgent performing RAG retrieval", session_id=session_id)
        rag_results = self.retriever.retrieve(rag_query, top_k=5)
        formatted_context = format_context(rag_results)
        sources           = [r.get("source", "unknown") for r in rag_results]

        state["retrieved_context"] = formatted_context
        state["context_sources"]   = sources

        logger.info(
            "RAG retrieval complete",
            session_id=session_id,
            chunks_retrieved=len(rag_results),
        )

        # ── Step 2: LLM symptom analysis ─────────────────────────────────────
        try:
            llm = self.llm_router.route("symptom")

            user_content = _USER_PROMPT_TEMPLATE.format(
                patient_summary     = parsed_intake.get("patient_summary", ""),
                normalized_symptoms = json.dumps(normalized_symptoms),
                red_flags           = json.dumps(parsed_intake.get("red_flags", [])),
                retrieved_context   = formatted_context,
            )

            messages = [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=user_content),
            ]

            logger.info("SymptomAgent invoking LLM", session_id=session_id)
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

            parsed = _safe_parse_json(raw_text, agent_name="symptom")

            if parsed is None:
                raise ValueError("LLM returned unparseable JSON for symptom analysis")

            state["symptoms_analysis"]  = parsed
            state["symptom_severity"]   = parsed.get("severity", "unknown")
            state["symptom_categories"] = parsed.get("body_systems_affected", [])

            # Escalate urgency immediately if emergency detected
            if parsed.get("requires_emergency", False):
                logger.warning(
                    "EMERGENCY FLAG — symptom agent detected critical triage condition",
                    session_id=session_id,
                    triage=parsed.get("triage_recommendation"),
                )
                state["urgency_level"] = "critical"

            logger.info(
                "SymptomAgent completed",
                session_id=session_id,
                severity=state["symptom_severity"],
                body_systems=state["symptom_categories"],
                requires_emergency=parsed.get("requires_emergency", False),
            )

            # Broadcast completed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_COMPLETED,
                        session_id=session_id,
                        agent_name="symptom",
                        timestamp=datetime.utcnow().isoformat(),
                        message="Symptom Agent completed",
                        data={
                            "duration_seconds": duration,
                            "symptom_severity": state["symptom_severity"]
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast agent_completed event via websocket", session_id=session_id, error=str(ws_err))

        except Exception as exc:
            logger.error("SymptomAgent failed", session_id=session_id, error=str(exc))

            error_record = _build_error_record("symptom", str(exc))
            state["agent_errors"] = state.get("agent_errors", []) + [error_record]

            # Safe fallback analysis
            state["symptoms_analysis"]  = _build_fallback_analysis(parsed_intake)
            state["symptom_severity"]   = "unknown"
            state["symptom_categories"] = []

            # Broadcast failed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_FAILED,
                        session_id=session_id,
                        agent_name="symptom",
                        timestamp=datetime.utcnow().isoformat(),
                        message=f"Symptom Agent failed: {str(exc)}",
                        data={
                            "duration_seconds": duration,
                            "error": str(exc)
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast agent_failed event via websocket", session_id=session_id, error=str(ws_err))

        # ── Update orchestration metadata ────────────────────────────────────
        completed = list(state.get("completed_agents", []))
        completed.append("symptom")
        state["completed_agents"] = completed
        state["current_agent"]    = "diagnosis"

        return state


# ── Helpers ───────────────────────────────────────────────────────────────────

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


def _build_fallback_analysis(parsed_intake: Dict[str, Any]) -> Dict[str, Any]:
    """Safe fallback when LLM call fails."""
    return {
        "severity":              "unknown",
        "body_systems_affected": [],
        "symptom_clusters":      [],
        "icd10_categories":      [],
        "triage_recommendation": "routine",
        "clinical_reasoning":    "Symptom analysis could not be completed due to a processing error.",
        "requires_emergency":    False,
    }
