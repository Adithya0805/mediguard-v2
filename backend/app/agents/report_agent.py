"""
MediGuard V2 — Clinical Report Generator Agent
Fifth and final agent in the LangGraph pipeline.

Responsibility:
  Synthesise all prior agent outputs into a final structured clinical decision
  support report, ready for physician review and database persistence.

LLM used: get_llm() — Claude Sonnet (balanced depth for report narrative)

Robustness:
  - Tolerates markdown-fenced, multi-line, and control-character-laden output.
  - Unwraps a single-element JSON array into an object (common LLM quirk).
  - Normalises every downstream field to a safe default so broken / partial
    LLM output can never crash persistence or the PDF / FHIR generators.
  - Merges mandatory clinical disclaimers instead of trusting LLM output alone.
  - Enriches the report with primary diagnosis, citations, and drug-safety data
    from the shared state so the report is fully self-contained.
  - Bounded single retry (tracked via ``state["retry_count"]``) before falling
    back to a physician-review-required report that still persists cleanly.
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

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
  "patient_discharge_summary": {{
    "condition_explanation": "Simple 2-3 sentence explanation of the condition in plain everyday words (6th grade reading level)",
    "home_care_instructions": ["Actionable step 1", "Actionable step 2"],
    "medications_guide": [
      {{
        "medication": "Drug name",
        "purpose": "What this medicine does",
        "instructions": "How and when to take it",
        "precautions": "Special precautions"
      }}
    ],
    "emergency_red_flags": ["Critical signs that mean call emergency services or return to ER immediately"],
    "activity_and_diet": ["Diet and physical activity recommendations"],
    "follow_up_timeline": "Specific timeline for follow-up visit"
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

# ── Mandatory disclaimers — always merged into every report ───────────────────
_MANDATORY_DISCLAIMERS = [
    "This report is AI-generated clinical decision support only.",
    "All recommendations must be reviewed by a licensed physician.",
    "This system does not replace clinical judgment.",
]

# ── Retry bounds ──────────────────────────────────────────────────────────────
_MAX_REPORT_ATTEMPTS = 2  # initial attempt + one retry
_MAX_RETRY_COUNT = 1      # bounded retries, tracked via state["retry_count"]


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

        parsed: Optional[Dict[str, Any]] = None

        try:
            llm = self.llm_router.route("report")
            model_used = _get_model_id(llm)

            last_error: Optional[str] = None

            # Bounded attempts: initial call + at most one retry (globally gated)
            for attempt in range(1, _MAX_REPORT_ATTEMPTS + 1):
                try:
                    user_content = _build_user_content(
                        parsed_intake,
                        symptoms_analysis,
                        differential_diagnosis,
                        primary_diagnosis,
                        drug_interactions,
                        urgency_level,
                        context_sources,
                        retry=attempt > 1,
                    )

                    messages = [
                        SystemMessage(content=_SYSTEM_PROMPT),
                        HumanMessage(content=user_content),
                    ]

                    logger.info("ReportAgent invoking LLM", session_id=session_id, attempt=attempt)
                    response = await llm.ainvoke(messages)

                    raw_text = _extract_response_text(response)
                    parsed = _safe_parse_report_json(raw_text)

                    if parsed is not None:
                        break

                    last_error = "LLM returned unparseable JSON for report generation"
                    logger.warning(
                        "ReportAgent returned malformed output",
                        session_id=session_id,
                        attempt=attempt,
                    )

                except Exception as invoke_exc:
                    last_error = str(invoke_exc)
                    logger.warning(
                        "ReportAgent LLM call failed",
                        session_id=session_id,
                        attempt=attempt,
                        error=str(invoke_exc),
                    )

                # Bounded retry — only one retry, gated on the global counter
                if state.get("retry_count", 0) >= _MAX_RETRY_COUNT:
                    break

                state["retry_count"] = state.get("retry_count", 0) + 1
                logger.warning(
                    "ReportAgent scheduling retry",
                    session_id=session_id,
                    attempt=attempt,
                    retry_count=state["retry_count"],
                )

            if parsed is None:
                raise ValueError(last_error or "LLM returned unparseable JSON for report generation")

            # Normalise → fill metadata → enrich with state data
            report = _normalize_report(
                parsed,
                state,
                generation_seconds,
                model_used=model_used,
            )

            state["report"]                    = report
            state["report_metadata"]           = dict(report.get("report_metadata", {}))
            state["patient_discharge_summary"] = dict(report.get("patient_discharge_summary", {}))
            state["report_generated"]          = True

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

            # Fallback report — partial LLM output (if any) is merged, never wiped.
            state["report"] = _build_fallback_report(
                session_id,
                parsed_intake,
                urgency_level,
                completed_agents,
                generation_seconds,
                partial_report=parsed if isinstance(parsed, dict) else None,
                state=state,
            )
            state["report_metadata"]           = dict(state["report"].get("report_metadata", {}))
            state["patient_discharge_summary"] = dict(state["report"].get("patient_discharge_summary", {}))
            state["report_generated"]          = True   # mark True — partial report is still a report

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
        if "report" not in completed:
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


def _extract_response_text(response: Any) -> str:
    """
    Extract a plain text string from an LLM response regardless of shape.

    Handles AIMessage with ``content`` as str, as a list of content blocks
    (dicts with ``type``/``text`` or raw strings), or non-message objects.
    """
    content = getattr(response, "content", None)
    if content is None:
        return str(response)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "")
            if isinstance(block, dict) and block.get("type") == "text"
            else (block if isinstance(block, str) else "")
            for block in content
        )
    return str(content)


def _try_load_json(text: str) -> Any:
    """Best-effort json.loads with control-character tolerance."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    try:
        return json.loads(text, strict=False)
    except json.JSONDecodeError:
        return None


def _unwrap_single_element_list(value: Any) -> Any:
    """Unwrap ``[{...}]`` — some models wrap the object in a single-element array."""
    if isinstance(value, list) and len(value) == 1:
        return value[0]
    return value


def _safe_parse_report_json(raw: str) -> Optional[Dict[str, Any]]:
    """
    Robustly parse an LLM report response into a dict, or None if impossible.

    Accepts markdown fences, surrounding prose, multi-line JSON, and a
    single-element JSON array. Rejects scalars and multi-element arrays so the
    caller never has to guard against ``.get`` on non-dict values.
    """
    text = raw.strip()
    if not text:
        logger.error("Report Agent returned empty response")
        return None

    # Strip markdown fences if present
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()

    candidates = [text]

    # Fallback: extract the outermost {...} span (handles prose wrappers)
    start = text.find("{")
    end   = text.rfind("}")
    if start != -1 and end != -1 and (start > 0 or end < len(text) - 1):
        candidates.append(text[start : end + 1])

    for candidate in candidates:
        parsed = _try_load_json(candidate)
        if parsed is None:
            continue
        parsed = _unwrap_single_element_list(parsed)
        if isinstance(parsed, dict):
            return parsed

    logger.error("Report Agent JSON parse failed")
    return None


def _coerce_str(value: Any, default: str) -> str:
    """Coerce to str when possible, otherwise fall back to default."""
    if isinstance(value, str):
        return value
    if value is None:
        return default
    return str(value)


def _coerce_str_list(value: Any) -> list:
    """Coerce to a list of strings (single string → single-element list)."""
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str) and value.strip():
        return [value]
    return []


def _get_model_id(llm: Any) -> str:
    """Best-effort model identifier from common LangChain client shapes."""
    for attr in ("model_id", "model_name", "model"):
        value = getattr(llm, attr, None)
        if isinstance(value, str) and value:
            return value
    return "unknown"


def _normalize_report(
    parsed: Dict[str, Any],
    state: AgentState,
    generation_seconds: float,
    model_used: str = "unknown",
) -> Dict[str, Any]:
    """
    Normalise a parsed LLM report into the safe downstream contract shape.

    Guarantees:
      - Every scalar/list field present with a safe default (never None/crash).
      - ``report_metadata`` is always a dict with orchestration-accurate values.
      - Mandatory clinical disclaimers are merged (LLM extras preserved).
      - Report is enriched with primary diagnosis / citations / drug-safety data
        from state so it is self-contained for persistence, PDF, and FHIR.
    """
    report: Dict[str, Any] = dict(parsed) if isinstance(parsed, dict) else {}

    # ── Scalar fields ─────────────────────────────────────────────────────────
    report["executive_summary"] = _coerce_str(
        report.get("executive_summary"),
        "AI-generated clinical decision support summary.",
    )
    report["clinical_narrative"] = _coerce_str(report.get("clinical_narrative"), "")
    report["primary_impression"] = _coerce_str(
        report.get("primary_impression"),
        "No primary impression recorded.",
    )
    report["differential_summary"] = _coerce_str(report.get("differential_summary"), "")
    report["medication_notes"] = _coerce_str(report.get("medication_notes"), "")
    report["urgency_assessment"] = _coerce_str(
        report.get("urgency_assessment"),
        f"Urgency assessed as '{state.get('urgency_level', 'medium')}' by automated triage.",
    )
    report["disposition_recommendation"] = _coerce_str(
        report.get("disposition_recommendation"),
        "Physician review required before disposition decision.",
    )

    # ── List fields ───────────────────────────────────────────────────────────
    report["recommended_workup"] = _coerce_str_list(report.get("recommended_workup"))
    report["follow_up_instructions"] = _coerce_str_list(report.get("follow_up_instructions"))

    # ── Mandatory disclaimers: merge, never wipe ──────────────────────────────
    disclaimers = _coerce_str_list(report.get("clinical_disclaimers"))
    merged_disclaimers: list = []
    for item in disclaimers + _MANDATORY_DISCLAIMERS:
        if item not in merged_disclaimers:
            merged_disclaimers.append(item)
    report["clinical_disclaimers"] = merged_disclaimers

    # ── report_metadata: never None, orchestration-accurate ───────────────────
    raw_metadata = report.get("report_metadata")
    report_metadata = dict(raw_metadata) if isinstance(raw_metadata, dict) else {}

    completed_agents = list(state.get("completed_agents", []))
    if "report" not in completed_agents:
        completed_agents = completed_agents + ["report"]

    report_metadata["agents_used"]             = completed_agents
    report_metadata["generation_time_seconds"] = generation_seconds
    report_metadata["model_used"]              = model_used
    report_metadata["rag_sources_count"]       = len(state.get("context_sources", []))
    report["report_metadata"] = report_metadata

    # ── Enrich from state (fill gaps only — self-contained report) ────────────
    _backfill(report, "primary_diagnosis",    state.get("primary_diagnosis", {}))
    _backfill(report, "citations",            state.get("citations", []))
    _backfill(report, "differential_diagnosis", state.get("differential_diagnosis", []))
    _backfill(report, "drug_interactions",    state.get("drug_interactions", []))
    _backfill(report, "contraindications",    state.get("contraindications", []))
    _backfill(report, "medication_safety",    state.get("medication_safe", True))
    _backfill(report, "fda_data_used",        state.get("fda_data_used", False))
    _backfill(report, "urgency_level",        state.get("urgency_level", "medium"))

    # ── Patient Discharge Plain-Language Plan ─────────────────────────────────
    raw_discharge = report.get("patient_discharge_summary")
    report["patient_discharge_summary"] = _normalize_patient_discharge(raw_discharge, state)

    return report


def _normalize_patient_discharge(parsed_discharge: Any, state: Optional[AgentState] = None) -> Dict[str, Any]:
    """
    Normalise the patient-facing discharge plan into plain-language, empathetic,
    and actionable guidance (6th-grade reading level).
    """
    state = state or {}
    discharge = dict(parsed_discharge) if isinstance(parsed_discharge, dict) else {}
    patient_data = state.get("patient_data", {})
    primary_dx = state.get("primary_diagnosis", {})
    dx_name = primary_dx.get("diagnosis") or patient_data.get("chief_complaint", "your health concern")

    # 1. Condition explanation
    if not discharge.get("condition_explanation") or not isinstance(discharge.get("condition_explanation"), str):
        discharge["condition_explanation"] = (
            f"You were evaluated today for {dx_name}. "
            "Our medical team has provided care instructions to help support your recovery at home. "
            "Please follow this guidance carefully and contact us if your symptoms change."
        )

    # 2. Home care instructions
    home_care = discharge.get("home_care_instructions")
    if not isinstance(home_care, list) or not home_care:
        discharge["home_care_instructions"] = [
            "Get plenty of rest and avoid strenuous physical activity until cleared by your doctor.",
            "Stay well hydrated by drinking water regularly, unless your doctor advised fluid limits.",
            "Keep a written log of your symptoms and temperature.",
            "Take all prescribed medications on time as directed."
        ]
    else:
        discharge["home_care_instructions"] = [str(x) for x in home_care]

    # 3. Medications guide
    meds_guide = discharge.get("medications_guide")
    if not isinstance(meds_guide, list) or not meds_guide:
        cur_meds = patient_data.get("current_medications", [])
        formatted_guide = []
        for med in cur_meds[:4]:
            formatted_guide.append({
                "medication": str(med),
                "purpose": "Prescribed therapy",
                "instructions": "Take strictly as directed by your clinician",
                "precautions": "Do not skip doses or double up if missed"
            })
        if not formatted_guide:
            formatted_guide.append({
                "medication": "None currently recorded",
                "purpose": "N/A",
                "instructions": "Continue routine medications only as advised by your physician",
                "precautions": "Consult your pharmacist before starting any over-the-counter medicine"
            })
        discharge["medications_guide"] = formatted_guide
    else:
        validated_guide = []
        for item in meds_guide:
            if isinstance(item, dict):
                validated_guide.append({
                    "medication": str(item.get("medication", "Medication")),
                    "purpose": str(item.get("purpose", "Therapy")),
                    "instructions": str(item.get("instructions", "Take as directed")),
                    "precautions": str(item.get("precautions", "Follow package directions"))
                })
        discharge["medications_guide"] = validated_guide or [{"medication": "None", "purpose": "N/A", "instructions": "None", "precautions": "None"}]

    # 4. Emergency red flags
    red_flags = discharge.get("emergency_red_flags")
    if not isinstance(red_flags, list) or not red_flags:
        discharge["emergency_red_flags"] = [
            "Sudden severe shortness of breath or difficulty breathing",
            "Crushing chest pressure, tightness, or pain spreading to arm or jaw",
            "Sudden weakness, numbness, facial droop, or trouble speaking",
            "High fever with stiff neck, severe headache, or confusion",
            "Persistent vomiting, coughing up blood, or black/tarry bowel movements"
        ]
    else:
        discharge["emergency_red_flags"] = [str(x) for x in red_flags]

    # 5. Activity and diet
    act_diet = discharge.get("activity_and_diet")
    if not isinstance(act_diet, list) or not act_diet:
        discharge["activity_and_diet"] = [
            "Eat light, balanced meals as tolerated.",
            "Avoid alcohol and tobacco products during recovery.",
            "Resume normal physical activity gradually as your strength returns."
        ]
    else:
        discharge["activity_and_diet"] = [str(x) for x in act_diet]

    # 6. Follow up timeline
    if not discharge.get("follow_up_timeline") or not isinstance(discharge.get("follow_up_timeline"), str):
        discharge["follow_up_timeline"] = "Schedule a follow-up visit with your primary care physician within 2 to 3 days."

    return discharge


def _backfill(report: Dict[str, Any], key: str, fallback: Any) -> None:
    """Fill ``key`` with ``fallback`` only when missing, null, or empty."""
    if report.get(key) in (None, {}, []):
        report[key] = fallback


def _build_user_content(
    parsed_intake: Dict[str, Any],
    symptoms_analysis: Dict[str, Any],
    differential_diagnosis: list,
    primary_diagnosis: Dict[str, Any],
    drug_interactions: list,
    urgency_level: str,
    context_sources: list,
    retry: bool = False,
) -> str:
    """Render the user prompt, appending a strict-JSON nudge on retry."""
    content = _USER_PROMPT_TEMPLATE.format(
        patient_summary        = parsed_intake.get("patient_summary", "Unknown patient"),
        symptoms_analysis      = json.dumps(symptoms_analysis, indent=2),
        differential_diagnosis = json.dumps(differential_diagnosis, indent=2),
        primary_diagnosis      = json.dumps(primary_diagnosis, indent=2),
        drug_interactions      = json.dumps(drug_interactions, indent=2),
        urgency_level          = urgency_level,
        context_sources        = json.dumps(context_sources),
    )
    if retry:
        content += (
            "\n\nIMPORTANT: Your previous response was not valid JSON. "
            "Respond with ONLY a single valid JSON object — no markdown fences, "
            "no commentary, no extra text."
        )
    return content


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
    partial_report: Optional[Dict[str, Any]] = None,
    state: Optional[AgentState] = None,
) -> Dict[str, Any]:
    """
    Minimal clinical report when LLM synthesis fails entirely.

    Any ``partial_report`` fields are merged in (never wiped), mandatory
    disclaimers are enforced, and state-derived data (primary diagnosis,
    citations, drug safety) is enriched so the report persists cleanly.
    """
    state = state or {}

    skeleton: Dict[str, Any] = {
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
    }

    if isinstance(partial_report, dict):
        merged = dict(skeleton)
        for key, value in partial_report.items():
            if key != "report_metadata":
                merged[key] = value
        skeleton = merged

    return _normalize_report(skeleton, state, generation_seconds, model_used="fallback")
