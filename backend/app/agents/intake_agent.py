"""
MediGuard V2 — Intake Agent
First agent in the LangGraph pipeline.

Responsibility:
  Parse, validate, normalise, and structure raw patient input into a clean
  clinical format that downstream agents can rely on.

LLM used: get_fast_llm() — Claude Haiku (speed over depth at intake stage)
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict

from app.llm.router import LLMRouter
from app.rag.retriever import MedicalRetriever
from app.schemas.agent import AgentState
from app.utils.logger import get_logger

logger = get_logger("app.agents.intake_agent")

# ── System prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are a clinical intake specialist AI. Your job is to parse raw patient "
    "intake data and produce a clean, structured clinical summary. Be precise. "
    "Do not infer beyond what is stated. Respond only in valid JSON."
)

# ── User prompt template ──────────────────────────────────────────────────────
_USER_PROMPT_TEMPLATE = """\
Parse this patient intake and return a JSON object with:
{{
  "patient_summary": "2-3 sentence clinical summary",
  "normalized_symptoms": ["list of symptoms in clinical terminology"],
  "symptom_onset": "acute / subacute / chronic",
  "symptom_duration_estimate": "string",
  "relevant_history": ["key history points relevant to chief complaint"],
  "relevant_medications": ["medications relevant to symptoms"],
  "red_flags": ["any immediately concerning symptoms"],
  "intake_confidence": 0.0-1.0
}}

Patient data:
{patient_data}
"""


class IntakeAgent:
    """
    Specialist agent responsible for initial clinical data validation
    and intake parsing. Produces a structured parsed_intake dict that
    every downstream agent reads.
    """

    def __init__(self, llm_router: LLMRouter, retriever: MedicalRetriever):
        self.llm_router = llm_router
        self.retriever = retriever
        logger.info("IntakeAgent initialised")

    async def run(self, state: AgentState) -> AgentState:
        """
        Parse raw patient_data from state into a clean clinical intake dict.

        Args:
            state: Current shared AgentState.

        Returns:
            Updated AgentState with parsed_intake and intake_confidence set.
        """
        session_id = state.get("session_id", "unknown")
        logger.info("IntakeAgent starting", session_id=session_id)

        patient_data = state.get("patient_data", {})

        try:
            llm = self.llm_router.route("intake")

            # Build the prompt messages for the LLM
            from langchain_core.messages import HumanMessage, SystemMessage

            user_content = _USER_PROMPT_TEMPLATE.format(
                patient_data=json.dumps(patient_data, indent=2)
            )

            messages = [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=user_content),
            ]

            logger.info(
                "IntakeAgent invoking LLM",
                session_id=session_id,
                patient_name=patient_data.get("patient_name", "unknown"),
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

            # ── Parse JSON response ───────────────────────────────────────────
            parsed = _safe_parse_json(raw_text, agent_name="intake")

            if parsed is None:
                raise ValueError("LLM returned unparseable JSON for intake")

            state["parsed_intake"]     = parsed
            state["intake_confidence"] = float(parsed.get("intake_confidence", 0.5))

            logger.info(
                "IntakeAgent completed successfully",
                session_id=session_id,
                confidence=state["intake_confidence"],
                red_flags_count=len(parsed.get("red_flags", [])),
            )

        except Exception as exc:
            logger.error(
                "IntakeAgent failed",
                session_id=session_id,
                error=str(exc),
            )
            # Record error in state — do NOT crash the pipeline
            error_record = _build_error_record("intake", str(exc))
            state["agent_errors"] = state.get("agent_errors", []) + [error_record]

            # Set safe fallback intake so downstream agents can still run
            state["parsed_intake"] = _build_fallback_intake(patient_data)
            state["intake_confidence"] = 0.1

        # ── Update orchestration metadata ────────────────────────────────────
        completed = list(state.get("completed_agents", []))
        completed.append("intake")
        state["completed_agents"] = completed
        state["current_agent"] = "symptom"

        return state


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_parse_json(raw: str, agent_name: str) -> Dict[str, Any] | None:
    """Attempt to extract and parse a JSON block from raw LLM output."""
    text = raw.strip()

    # Strip markdown code fences if present
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning(
            "JSON parse failed — trying brace extraction",
            agent=agent_name,
            error=str(exc),
        )
        # Try extracting the outermost JSON object
        start = text.find("{")
        end   = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

    logger.error("All JSON parse attempts failed", agent=agent_name)
    return None


def _build_error_record(agent_name: str, error_message: str) -> Dict[str, Any]:
    return {
        "agent":     agent_name,
        "error":     error_message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _build_fallback_intake(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """Minimal safe fallback intake when LLM parsing fails."""
    return {
        "patient_summary":           f"Patient age {patient_data.get('patient_age', 'unknown')} presenting with {patient_data.get('chief_complaint', 'unspecified complaint')}.",
        "normalized_symptoms":       patient_data.get("symptoms", []),
        "symptom_onset":             "unknown",
        "symptom_duration_estimate": "unknown",
        "relevant_history":          patient_data.get("medical_history", []),
        "relevant_medications":      patient_data.get("current_medications", []),
        "red_flags":                 [],
        "intake_confidence":         0.1,
    }
