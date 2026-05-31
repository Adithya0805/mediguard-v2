"""
MediGuard V2 — Drug Interaction Checker Agent
Fourth agent in the LangGraph pipeline.

Responsibility:
  Check all current medications against each other and against the primary
  diagnosis treatment context for interactions, contraindications, and
  allergy conflicts.

LLM used: get_fast_llm() — Claude Haiku (speed over depth — structured lookup)

Safety rule: If no medications are present, skip the LLM call entirely and
mark medication_safe = True. Never block the pipeline for a missing drug list.
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage

from app.llm.router import LLMRouter
from app.rag.retriever import MedicalRetriever, format_context
from app.schemas.agent import AgentState
from app.utils.logger import get_logger

logger = get_logger("app.agents.drug_agent")

# ── System prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are a clinical pharmacology AI specialising in drug interaction analysis. "
    "Check for interactions systematically. Safety is paramount — err on the side "
    "of caution. Respond only in valid JSON."
)

# ── User prompt template ──────────────────────────────────────────────────────
_USER_PROMPT_TEMPLATE = """\
Analyze these medications for interactions and safety.

Current medications: {current_medications}
Known allergies: {allergies}
Primary diagnosis context: {primary_diagnosis}
Drug reference context: {retrieved_context}

Return a JSON object with:
{{
  "interactions_found": true/false,
  "drug_interactions": [
    {{
      "drug_a": "",
      "drug_b": "",
      "severity": "mild | moderate | severe | contraindicated",
      "mechanism": "brief pharmacological explanation",
      "clinical_effect": "what happens clinically",
      "management": "how to manage this interaction"
    }}
  ],
  "allergy_conflicts": [
    {{
      "medication": "",
      "allergen": "",
      "risk": "description of risk"
    }}
  ],
  "contraindications": ["list of specific contraindications found"],
  "overall_medication_safe": true/false,
  "pharmacist_review_required": true/false,
  "safety_notes": ["important safety notes"]
}}
"""


class DrugAgent:
    """
    Specialist agent that checks current patient medications for dangerous
    interactions, allergy conflicts, and contraindications using a fast LLM
    backed by RAG-retrieved pharmacology references.
    """

    def __init__(self, llm_router: LLMRouter, retriever: MedicalRetriever):
        self.llm_router = llm_router
        self.retriever  = retriever
        logger.info("DrugAgent initialised")

    async def run(self, state: AgentState) -> AgentState:
        """
        Perform drug interaction and safety analysis for the current patient.

        Args:
            state: Current shared AgentState.

        Returns:
            Updated AgentState with drug_interactions, contraindications, and
            medication_safe populated.
        """
        session_id          = state.get("session_id", "unknown")
        patient_data        = state.get("patient_data", {})
        current_medications = patient_data.get("current_medications", [])
        allergies           = patient_data.get("allergies", [])
        primary_diagnosis   = state.get("primary_diagnosis", {})

        logger.info(
            "DrugAgent starting",
            session_id=session_id,
            medication_count=len(current_medications),
        )

        # ── Early exit: no medications to check ──────────────────────────────
        if not current_medications:
            logger.info(
                "DrugAgent: no medications — skipping LLM call",
                session_id=session_id,
            )
            state["drug_interactions"] = []
            state["contraindications"] = []
            state["medication_safe"]   = True

            completed = list(state.get("completed_agents", []))
            completed.append("drug_check")
            state["completed_agents"] = completed
            state["current_agent"]    = "report"
            return state

        # ── Step 1: RAG retrieval for drug references ────────────────────────
        drug_query = f"drug interactions {' '.join(current_medications[:5])}"
        logger.info("DrugAgent RAG retrieval", session_id=session_id)
        rag_results = self.retriever.retrieve(drug_query, top_k=4)
        drug_context = format_context(rag_results)

        # ── Step 2: LLM drug interaction analysis ────────────────────────────
        try:
            llm = self.llm_router.route("drug_check")

            diagnosis_name = primary_diagnosis.get("diagnosis", "not yet determined")

            user_content = _USER_PROMPT_TEMPLATE.format(
                current_medications = json.dumps(current_medications),
                allergies           = json.dumps(allergies),
                primary_diagnosis   = diagnosis_name,
                retrieved_context   = drug_context,
            )

            messages = [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=user_content),
            ]

            logger.info("DrugAgent invoking LLM", session_id=session_id)
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

            parsed = _safe_parse_json(raw_text, agent_name="drug_check")
            if parsed is None:
                raise ValueError("LLM returned unparseable JSON for drug analysis")

            state["drug_interactions"] = parsed.get("drug_interactions", [])
            state["contraindications"] = parsed.get("contraindications", [])
            state["medication_safe"]   = parsed.get("overall_medication_safe", True)

            # Clinical flag — pharmacist review needed → record as WARNING, not error
            if parsed.get("pharmacist_review_required", False):
                logger.warning(
                    "CLINICAL FLAG: Pharmacist review required",
                    session_id=session_id,
                    safety_notes=parsed.get("safety_notes", []),
                )
                warning_record = {
                    "agent":     "drug_check",
                    "error":     "CLINICAL WARNING: Pharmacist review required before dispensing.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                state["agent_errors"] = state.get("agent_errors", []) + [warning_record]

            logger.info(
                "DrugAgent completed",
                session_id=session_id,
                interactions_found=parsed.get("interactions_found", False),
                medication_safe=state["medication_safe"],
                interaction_count=len(state["drug_interactions"]),
            )

        except Exception as exc:
            logger.error("DrugAgent failed", session_id=session_id, error=str(exc))

            error_record = _build_error_record("drug_check", str(exc))
            state["agent_errors"] = state.get("agent_errors", []) + [error_record]

            # Safe fallback: assume unknown safety — flag for review
            state["drug_interactions"] = []
            state["contraindications"] = []
            state["medication_safe"]   = False    # conservative: unknown = unsafe

        # ── Update orchestration metadata ────────────────────────────────────
        completed = list(state.get("completed_agents", []))
        completed.append("drug_check")
        state["completed_agents"] = completed
        state["current_agent"]    = "report"

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
