"""
MediGuard V2 — Production Agent State TypedDict

Shared state object passed through every node in the LangGraph pipeline.
Every agent reads from and writes to this single state object.
All fields must be present — use safe defaults when initialising.
"""
from typing import TypedDict, List, Dict, Any, Optional


class AgentState(TypedDict):
    """
    LangGraph shared state carrying all clinical variables across specialist agents.
    Initialised by the orchestrator before graph invocation.
    Each agent receives the full state, enriches its fields, and returns it.
    """

    # ── Session context ──────────────────────────────────────────────────────
    session_id:             str          # UUID string of the patient session
    created_at:             str          # ISO timestamp — session creation time

    # ── Raw patient input ────────────────────────────────────────────────────
    patient_data:           Dict[str, Any]  # Full PatientInput dict

    # ── Intake agent output ──────────────────────────────────────────────────
    parsed_intake:          Dict[str, Any]  # Structured intake parsing result
    intake_confidence:      float           # 0.0–1.0 parsing confidence score

    # ── Symptom agent output ─────────────────────────────────────────────────
    symptoms_analysis:      Dict[str, Any]  # Full symptom analysis result dict
    symptom_severity:       str             # mild / moderate / severe / critical
    symptom_categories:     List[str]       # Body systems affected

    # ── RAG context (injected before / during diagnosis) ─────────────────────
    retrieved_context:      str             # Formatted RAG result string
    context_sources:        List[str]       # Source citation strings

    # ── Diagnosis agent output ───────────────────────────────────────────────
    differential_diagnosis: List[Dict[str, Any]]  # Ranked DDx list
    primary_diagnosis:      Dict[str, Any]         # Top-ranked diagnosis object
    urgency_level:          str                    # low / medium / high / critical

    # ── Drug agent output ─────────────────────────────────────────────────────
    drug_interactions:      List[Dict[str, Any]]  # Detected drug interactions
    contraindications:      List[str]             # Explicit contraindication strings
    medication_safe:        bool                  # Overall medication safety flag
    fda_data_used:          bool                  # True if OpenFDA real data was used

    # ── Report agent output ──────────────────────────────────────────────────
    report:                 Dict[str, Any]  # Full synthesised clinical report dict
    report_generated:       bool            # True once report agent completes

    # ── Orchestration metadata ───────────────────────────────────────────────
    current_agent:          str             # Name of currently executing agent
    completed_agents:       List[str]       # Ordered list of completed agent names
    agent_errors:           List[Dict[str, Any]]  # Error records per agent
    retry_count:            int             # Global retry counter
    pipeline_start_time:    str             # ISO timestamp — pipeline start
    pipeline_end_time:      str             # ISO timestamp — pipeline end


def build_initial_state(session_id: str, patient_data: Dict[str, Any]) -> AgentState:
    """
    Build a safe, fully-initialised AgentState for a new pipeline run.

    Args:
        session_id:   UUID string of the patient session.
        patient_data: Dict representation of the PatientInput payload.

    Returns:
        AgentState with all fields initialised to safe defaults.
    """
    from datetime import datetime, timezone

    now_iso = datetime.now(timezone.utc).isoformat()

    return AgentState(
        # Session
        session_id=session_id,
        created_at=now_iso,

        # Input
        patient_data=patient_data,

        # Intake
        parsed_intake={},
        intake_confidence=0.0,

        # Symptom
        symptoms_analysis={},
        symptom_severity="unknown",
        symptom_categories=[],

        # RAG
        retrieved_context="",
        context_sources=[],

        # Diagnosis
        differential_diagnosis=[],
        primary_diagnosis={},
        urgency_level="medium",     # safe default until set by agents

        # Drug
        drug_interactions=[],
        contraindications=[],
        medication_safe=True,
        fda_data_used=False,

        # Report
        report={},
        report_generated=False,

        # Orchestration
        current_agent="intake",
        completed_agents=[],
        agent_errors=[],
        retry_count=0,
        pipeline_start_time=now_iso,
        pipeline_end_time="",
    )
