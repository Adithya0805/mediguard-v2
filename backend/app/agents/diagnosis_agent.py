"""
MediGuard V2 — Differential Diagnosis Agent
Third agent in the LangGraph pipeline — the most critical agent.

Responsibility:
  Generate a ranked differential diagnosis list (3–6 diagnoses) with
  confidence scores, ICD-10 codes, clinical reasoning, and recommended
  diagnostic workup.

LLM used: get_reasoning_llm() — Claude Sonnet (max tokens, complex reasoning)
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

logger = get_logger("app.agents.diagnosis_agent")

# ── System prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are an expert clinical diagnostician AI trained on evidence-based medicine. "
    "Generate a rigorous differential diagnosis. "
    "Consider common conditions first (horses before zebras), but do not miss serious "
    "or life-threatening conditions. Every diagnosis must have evidence-based reasoning. "
    "Respond only in valid JSON."
)

# ── User prompt template ──────────────────────────────────────────────────────
_USER_PROMPT_TEMPLATE = """\
Generate a differential diagnosis for this patient.

Patient summary: {patient_summary}
Symptom analysis: {symptoms_analysis}
Medical knowledge context: {combined_context}
Current medications: {current_medications}
Medical history: {medical_history}
Allergies: {allergies}

Return a JSON object with:
{{
  "differential_diagnosis": [
    {{
      "rank": 1,
      "diagnosis": "Full diagnosis name",
      "icd10_code": "X00.0",
      "confidence": 0.0,
      "supporting_evidence": ["list of symptoms/findings supporting this"],
      "against_evidence": ["list of findings that argue against this"],
      "clinical_reasoning": "detailed reasoning paragraph",
      "urgency": "immediate | urgent | semi-urgent | routine"
    }}
  ],
  "primary_diagnosis": {{ "same structure as above, rank 1" }},
  "recommended_tests": ["ordered list of diagnostic tests"],
  "recommended_specialists": ["specialties to refer to if needed"],
  "overall_urgency": "low | medium | high | critical",
  "clinical_summary": "comprehensive paragraph for the report"
}}

Generate minimum 3, maximum 6 differential diagnoses.
"""


class DiagnosisAgent:
    """
    Specialist agent that generates a ranked differential diagnosis list
    using both RAG-retrieved medical knowledge and prior agent outputs.
    This is the highest-stakes agent in the pipeline.
    """

    def __init__(self, llm_router: LLMRouter, retriever: MedicalRetriever):
        self.llm_router = llm_router
        self.retriever  = retriever
        logger.info("DiagnosisAgent initialised")

    async def run(self, state: AgentState) -> AgentState:
        """
        Generate differential diagnoses from parsed_intake, symptoms_analysis,
        and a focused second RAG retrieval pass.

        Args:
            state: Current shared AgentState.

        Returns:
            Updated AgentState with differential_diagnosis, primary_diagnosis,
            urgency_level, and recommended_tests populated.
        """
        session_id       = state.get("session_id", "unknown")
        parsed_intake    = state.get("parsed_intake", {})
        symptoms_analysis = state.get("symptoms_analysis", {})
        patient_data     = state.get("patient_data", {})

        logger.info("DiagnosisAgent starting", session_id=session_id)

        # Broadcast start event
        try:
            await ws_manager.broadcast_to_session(
                session_id,
                AgentEvent(
                    event_type=AgentEventType.AGENT_STARTED,
                    session_id=session_id,
                    agent_name="diagnosis",
                    timestamp=datetime.utcnow().isoformat(),
                    message="Diagnosis Agent is analyzing...",
                    data={
                        "agent_display_name": "Diagnosis Agent",
                        "agent_icon": "search",
                        "estimated_seconds": 20
                    }
                )
            )
        except Exception as ws_err:
            logger.warning("Failed to broadcast agent_started event via websocket", session_id=session_id, error=str(ws_err))

        agent_start_time = datetime.utcnow()

        # ── Step 1: Second focused RAG retrieval on symptom clusters ─────────
        symptom_clusters = symptoms_analysis.get("symptom_clusters", [])
        cluster_text     = " ".join(
            c.get("cluster_name", "") for c in symptom_clusters
        ) if symptom_clusters else parsed_intake.get("patient_summary", "")

        diag_query = f"differential diagnosis {cluster_text} {patient_data.get('chief_complaint', '')}"
        logger.info("DiagnosisAgent RAG retrieval", session_id=session_id, query_length=len(diag_query))

        second_rag_results = self.retriever.retrieve(diag_query, top_k=6)
        second_context     = format_context(second_rag_results)

        # Combine first and second RAG contexts
        first_context   = state.get("retrieved_context", "")
        combined_context = f"{first_context}\n\n{'='*60}\n\nAdditional Diagnostic Context:\n\n{second_context}"

        # Extend context sources
        new_sources = [r.get("source", "unknown") for r in second_rag_results]
        existing_sources = list(state.get("context_sources", []))
        state["context_sources"] = list(set(existing_sources + new_sources))

        # ── Step 2: LLM differential diagnosis ───────────────────────────────
        try:
            llm = self.llm_router.route("diagnosis")

            user_content = _USER_PROMPT_TEMPLATE.format(
                patient_summary      = parsed_intake.get("patient_summary", ""),
                symptoms_analysis    = json.dumps(symptoms_analysis, indent=2),
                combined_context     = combined_context,
                current_medications  = json.dumps(patient_data.get("current_medications", [])),
                medical_history      = json.dumps(patient_data.get("medical_history", [])),
                allergies            = json.dumps(patient_data.get("allergies", [])),
            )

            messages = [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=user_content),
            ]

            logger.info(
                "DiagnosisAgent invoking REASONING LLM",
                session_id=session_id,
                context_length=len(combined_context),
            )

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

            parsed = _safe_parse_json(raw_text, agent_name="diagnosis")
            if parsed is None:
                raise ValueError("LLM returned unparseable JSON for diagnosis")

            ddx_list = parsed.get("differential_diagnosis", [])
            primary  = parsed.get("primary_diagnosis", ddx_list[0] if ddx_list else {})

            state["differential_diagnosis"] = ddx_list
            state["primary_diagnosis"]      = primary

            # Respect emergency override from symptom agent
            if state.get("urgency_level") != "critical":
                state["urgency_level"] = parsed.get("overall_urgency", "medium")

            logger.info(
                "DiagnosisAgent completed",
                session_id=session_id,
                ddx_count=len(ddx_list),
                primary_diagnosis=primary.get("diagnosis", "unknown"),
                urgency=state["urgency_level"],
            )

            # Broadcast completed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_COMPLETED,
                        session_id=session_id,
                        agent_name="diagnosis",
                        timestamp=datetime.utcnow().isoformat(),
                        message="Diagnosis Agent completed",
                        data={
                            "duration_seconds": duration,
                            "ddx_count": len(state.get("differential_diagnosis", []))
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast agent_completed event via websocket", session_id=session_id, error=str(ws_err))

        except Exception as exc:
            logger.error("DiagnosisAgent failed", session_id=session_id, error=str(exc))

            error_record = _build_error_record("diagnosis", str(exc))
            state["agent_errors"] = state.get("agent_errors", []) + [error_record]

            # Safety default: set urgency to "high" when diagnosis fails
            if state.get("urgency_level") not in ("critical",):
                state["urgency_level"] = "high"

            state["differential_diagnosis"] = _build_fallback_ddx(patient_data)
            state["primary_diagnosis"]      = {}

            # Broadcast failed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_FAILED,
                        session_id=session_id,
                        agent_name="diagnosis",
                        timestamp=datetime.utcnow().isoformat(),
                        message=f"Diagnosis Agent failed: {str(exc)}",
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
        completed.append("diagnosis")
        state["completed_agents"] = completed
        state["current_agent"]    = "drug_check"

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


def _build_fallback_ddx(patient_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Minimal fallback DDx when LLM call fails."""
    return [
        {
            "rank":               1,
            "diagnosis":          "Undifferentiated illness — clinical assessment required",
            "icd10_code":         "R69",
            "confidence":         0.0,
            "supporting_evidence": patient_data.get("symptoms", []),
            "against_evidence":   [],
            "clinical_reasoning": "Automated diagnosis could not be completed. Immediate physician review required.",
            "urgency":            "urgent",
        }
    ]
