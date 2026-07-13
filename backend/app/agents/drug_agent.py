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
import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage

from app.llm.router import LLMRouter
from app.rag.retriever import MedicalRetriever, format_context
from app.schemas.agent import AgentState
from app.utils.logger import get_logger
from app.utils.websocket_manager import ws_manager
from app.schemas.websocket import AgentEvent, AgentEventType
from app.services.openfda_client import fda_client

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

# ── Enriched User prompt template with FDA Label Data ──────────────────────────
_ENRICHED_USER_PROMPT_TEMPLATE = """\
Analyze these medications using the provided FDA drug label data.

Current medications: {current_medications}
Known allergies: {allergies}
Primary diagnosis: {primary_diagnosis}

=== REAL FDA DRUG DATA ===
Drug pair interaction checks:
{fda_results_text}

Individual drug warnings:
{all_warnings_text}
=== END FDA DATA ===

Using the FDA data above, return JSON:
{{
  "interactions_found": true/false,
  "drug_interactions": [
    {{
      "drug_a": "",
      "drug_b": "",
      "severity": "mild | moderate | severe | contraindicated",
      "mechanism": "brief pharmacological explanation of the interaction, citing real FDA data",
      "clinical_effect": "clinical outcome description",
      "management": "management instructions",
      "fda_cited": true/false,
      "fda_source": "FDA drug label - [drug name]"
    }}
  ],
  "allergy_conflicts": [
    {{
      "medication": "",
      "allergen": "",
      "risk": "description of risk"
    }}
  ],
  "contraindications": ["list of specific contraindications found, citing real FDA data"],
  "overall_medication_safe": true/false,
  "pharmacist_review_required": true/false,
  "safety_notes": ["important safety notes"],
  "fda_data_used": true
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

        # Broadcast start event
        try:
            await ws_manager.broadcast_to_session(
                session_id,
                AgentEvent(
                    event_type=AgentEventType.AGENT_STARTED,
                    session_id=session_id,
                    agent_name="drug_check",
                    timestamp=datetime.utcnow().isoformat(),
                    message="Drug Agent is analyzing...",
                    data={
                        "agent_display_name": "Drug Agent",
                        "agent_icon": "pill",
                        "estimated_seconds": 8
                    }
                )
            )
        except Exception as ws_err:
            logger.warning("Failed to broadcast agent_started event via websocket", session_id=session_id, error=str(ws_err))

        agent_start_time = datetime.utcnow()

        # ── Early exit: no medications to check ──────────────────────────────
        if not current_medications:
            logger.info(
                "DrugAgent: no medications — skipping LLM call",
                session_id=session_id,
            )
            state["drug_interactions"] = []
            state["contraindications"] = []
            state["medication_safe"]   = True
            state["fda_data_used"]     = False

            # Broadcast completed event for early exit
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_COMPLETED,
                        session_id=session_id,
                        agent_name="drug_check",
                        timestamp=datetime.utcnow().isoformat(),
                        message="Drug Agent completed",
                        data={
                            "duration_seconds": duration,
                            "interactions_found": 0
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast agent_completed event via websocket", session_id=session_id, error=str(ws_err))

            completed = list(state.get("completed_agents", []))
            completed.append("drug_check")
            state["completed_agents"] = completed
            state["current_agent"]    = "report"
            return state

        # ── Step 1: Query OpenFDA data ───────────────────────────────────────
        try:
            fda_results = await fda_client.batch_check_medications(current_medications)
            fda_available = True
            logger.info(
                "OpenFDA batch check complete",
                session_id=session_id,
                pairs_checked=fda_results["pairs_checked"],
                interactions_found=len(fda_results["interactions_found"])
            )
        except Exception as e:
            logger.warning(
                "OpenFDA unavailable: falling back to LLM-only mode",
                session_id=session_id,
                error=str(e)
            )
            fda_results = {
                "pairs_checked": 0,
                "interactions_found": [],
                "all_warnings": {},
                "all_contraindications": {}
            }
            fda_available = False

        # Format top 3 warnings and contraindications for each medication
        all_warnings = {}
        if fda_available:
            for med in current_medications:
                warnings = fda_results.get("all_warnings", {}).get(med, [])
                contraindications = fda_results.get("all_contraindications", {}).get(med, [])
                all_warnings[med] = {
                    "warnings": warnings[:3],
                    "contraindications": contraindications[:3]
                }

        # ── Step 2: RAG retrieval for drug references (fallback / seed) ──────
        drug_context = ""
        if not fda_available:
            drug_query = f"drug interactions {' '.join(current_medications[:5])}"
            logger.info("DrugAgent falling back to RAG retrieval", session_id=session_id)
            rag_results = self.retriever.retrieve(drug_query, top_k=4)
            drug_context = format_context(rag_results)

        # ── Step 3: LLM drug interaction analysis ────────────────────────────
        try:
            llm = self.llm_router.route("drug_check")
            diagnosis_name = primary_diagnosis.get("diagnosis", "not yet determined")

            if fda_available:
                # Format fda_results as readable text
                fda_results_text = ""
                interactions = fda_results.get("interactions_found", [])
                if interactions:
                    for idx, item in enumerate(interactions, 1):
                        fda_results_text += f"{idx}. {item['drug_a']} + {item['drug_b']}:\n"
                        for warning in item.get("relevant_warnings", []):
                            fda_results_text += f"   - {warning}\n"
                else:
                    fda_results_text = "No pairwise drug interaction warnings found on the FDA labels."

                # Format all_warnings as readable text
                all_warnings_text = ""
                for med, data in all_warnings.items():
                    all_warnings_text += f"Medication: {med}\n"
                    if data.get("warnings"):
                        all_warnings_text += "  - Warnings / Boxed Warnings:\n"
                        for w in data["warnings"]:
                            all_warnings_text += f"    * {w}\n"
                    if data.get("contraindications"):
                        all_warnings_text += "  - Contraindications:\n"
                        for c in data["contraindications"]:
                            all_warnings_text += f"    * {c}\n"
                    if not data.get("warnings") and not data.get("contraindications"):
                        all_warnings_text += "  - No warnings or contraindications found on label.\n"

                user_content = _ENRICHED_USER_PROMPT_TEMPLATE.format(
                    current_medications = json.dumps(current_medications),
                    allergies           = json.dumps(allergies),
                    primary_diagnosis   = diagnosis_name,
                    fda_results_text    = fda_results_text,
                    all_warnings_text   = all_warnings_text
                )
                system_content = (
                    "You are a clinical pharmacology AI. You have been provided with REAL FDA drug label data. "
                    "Analyze this data carefully and identify all clinically significant interactions. "
                    "Always cite the FDA data when reporting interactions. Respond only in valid JSON."
                )
            else:
                user_content = _USER_PROMPT_TEMPLATE.format(
                    current_medications = json.dumps(current_medications),
                    allergies           = json.dumps(allergies),
                    primary_diagnosis   = diagnosis_name,
                    retrieved_context   = drug_context,
                )
                system_content = _SYSTEM_PROMPT

            messages = [
                SystemMessage(content=system_content),
                HumanMessage(content=user_content),
            ]

            logger.info("DrugAgent invoking LLM", session_id=session_id, fda_available=fda_available)
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
            state["fda_data_used"]     = parsed.get("fda_data_used", fda_available)

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

            # Broadcast completed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_COMPLETED,
                        session_id=session_id,
                        agent_name="drug_check",
                        timestamp=datetime.utcnow().isoformat(),
                        message="Drug Agent completed",
                        data={
                            "duration_seconds": duration,
                            "interactions_found": len(state.get("drug_interactions", []))
                        }
                    )
                )
            except Exception as ws_err:
                logger.warning("Failed to broadcast agent_completed event via websocket", session_id=session_id, error=str(ws_err))

        except Exception as exc:
            logger.error("DrugAgent failed", session_id=session_id, error=str(exc))

            error_record = _build_error_record("drug_check", str(exc))
            state["agent_errors"] = state.get("agent_errors", []) + [error_record]

            # Safe fallback: assume unknown safety — flag for review
            state["drug_interactions"] = []
            state["contraindications"] = []
            state["medication_safe"]   = False    # conservative: unknown = unsafe
            state["fda_data_used"]     = False

            # Broadcast failed event
            duration = (datetime.utcnow() - agent_start_time).seconds
            try:
                await ws_manager.broadcast_to_session(
                    session_id,
                    AgentEvent(
                        event_type=AgentEventType.AGENT_FAILED,
                        session_id=session_id,
                        agent_name="drug_check",
                        timestamp=datetime.utcnow().isoformat(),
                        message=f"Drug Agent failed: {str(exc)}",
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
