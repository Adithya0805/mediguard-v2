"""
MediGuard V2 — Multimodal Clinical Intake Agent

Processes clinical media attachments (lab panels, ECG rhythm strips, medical PDFs):
1. Ingests raw base64 or preset attachments from patient intake
2. Extracts quantitative laboratory analytes mapped to standard LOINC codes
3. Performs 12-lead ECG rhythm and ischemic ST-elevation interpretation
4. Assesses clinical panic / critical value thresholds
5. Enriches AgentState.vitals and fast-tracks urgency to 'critical' on life-threatening findings
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.llm.router import LLMRouter
from app.rag.retriever import MedicalRetriever
from app.schemas.agent import AgentState
from app.schemas.multimodal import MultimodalAnalysisResult, ExtractedBiomarker, BiomarkerStatus
from app.services.multimodal_service import multimodal_service
from app.utils.logger import get_logger
from app.utils.websocket_manager import ws_manager
from app.schemas.websocket import AgentEvent, AgentEventType

logger = get_logger("app.agents.multimodal_agent")


class MultimodalAgent:
    """
    Specialist multimodal clinical intake agent.
    Extracts laboratory biomarkers, ECG ischemic criteria, and alerts downstream agents.
    """

    def __init__(self, llm_router: LLMRouter, retriever: MedicalRetriever):
        self.llm_router = llm_router
        self.retriever = retriever
        logger.info("MultimodalAgent initialized")

    async def run(self, state: AgentState) -> AgentState:
        """
        Processes any attachments or multimodal presets attached to the patient intake.
        Enriches AgentState with structured multimodal_data and critical_biomarkers.
        """
        session_id = state.get("session_id", "unknown")
        logger.info("MultimodalAgent starting", session_id=session_id)

        patient_data = state.get("patient_data", {})
        attachments = patient_data.get("attachments", [])
        preset_id = patient_data.get("multimodal_preset_id")

        # If no attachments and no preset requested, skip gracefully
        if not attachments and not preset_id:
            logger.info("No multimodal attachments present in session, bypassing", session_id=session_id)
            state["multimodal_data"] = {}
            state["critical_biomarkers"] = []
            return state

        # Broadcast start event
        try:
            await ws_manager.broadcast_to_session(
                session_id,
                AgentEvent(
                    event_type=AgentEventType.AGENT_STARTED,
                    session_id=session_id,
                    agent_name="multimodal",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    message="Multimodal Vision Agent analyzing lab panels and ECG diagnostic strips...",
                    data={
                        "agent_display_name": "Multimodal Vision Agent",
                        "agent_icon": "activity",
                        "attachment_count": len(attachments)
                    }
                )
            )
        except Exception as ws_err:
            logger.warning("Failed to broadcast multimodal agent start", session_id=session_id, error=str(ws_err))

        all_biomarkers: List[ExtractedBiomarker] = []
        all_alerts: List[str] = []
        ecg_summary: Optional[Dict[str, Any]] = None
        has_critical = False

        # 1. Check for clinical preset
        if preset_id:
            presets = {p.id: p for p in multimodal_service.get_clinical_presets()}
            if preset_id in presets:
                preset = presets[preset_id]
                logger.info("Loading multimodal clinical preset", preset_id=preset_id, title=preset.title)
                all_biomarkers.extend(preset.sample_biomarkers)
                if preset.sample_ecg:
                    ecg_summary = preset.sample_ecg.model_dump()
                    if preset.sample_ecg.is_stemi:
                        has_critical = True
                        all_alerts.append(f"EMERGENCY ECG: STEMI detected in leads {', '.join(preset.sample_ecg.st_elevation_leads)}")
                for b in preset.sample_biomarkers:
                    if b.criticality_flag:
                        has_critical = True
                        all_alerts.append(f"CRITICAL LAB VALUE: {b.name} = {b.value} {b.unit} ({b.status.value.upper()})")

        # 2. Process uploaded attachments
        for att in attachments:
            b64 = att.get("base64_data", "")
            fn = att.get("filename", "attachment.jpg")
            ct = att.get("content_type", "image/jpeg")
            mod = att.get("modality", "lab_panel")

            try:
                result = await multimodal_service.analyze_clinical_media(
                    base64_data=b64,
                    filename=fn,
                    content_type=ct,
                    modality_hint=mod
                )
                all_biomarkers.extend(result.extracted_biomarkers)
                if result.ecg_interpretation and not ecg_summary:
                    ecg_summary = result.ecg_interpretation.model_dump()
                    if result.ecg_interpretation.is_stemi:
                        has_critical = True
                if result.critical_alerts:
                    all_alerts.extend(result.critical_alerts)
                    has_critical = True
                if result.urgency_impact == "critical":
                    has_critical = True
            except Exception as att_err:
                logger.error("Error analyzing individual attachment", filename=fn, error=str(att_err))

        # 3. Compile critical biomarkers list
        critical_biomarkers_dict = [
            b.model_dump() for b in all_biomarkers if b.criticality_flag or b.status in [BiomarkerStatus.CRITICAL_HIGH, BiomarkerStatus.CRITICAL_LOW]
        ]

        # 4. Enrich vitals in patient_data
        vitals = state.get("patient_data", {}).get("vitals", {})
        for b in all_biomarkers:
            key_name = b.name.lower().replace(" ", "_")
            vitals[key_name] = f"{b.value} {b.unit}"
        if ecg_summary and ecg_summary.get("heart_rate_bpm"):
            vitals["heart_rate"] = ecg_summary["heart_rate_bpm"]
        state["patient_data"]["vitals"] = vitals

        # 5. Populate multimodal_data
        state["multimodal_data"] = {
            "biomarkers": [b.model_dump() for b in all_biomarkers],
            "ecg_interpretation": ecg_summary,
            "critical_alerts": all_alerts,
            "has_critical_findings": has_critical,
            "analyte_count": len(all_biomarkers),
            "processed_at": datetime.now(timezone.utc).isoformat()
        }
        state["critical_biomarkers"] = critical_biomarkers_dict

        # 6. Escalate urgency if critical panic value detected
        if has_critical:
            logger.warning(
                "Critical panic value or STEMI detected — escalating urgency to CRITICAL",
                session_id=session_id,
                alert_count=len(all_alerts)
            )
            state["urgency_level"] = "critical"

        # Broadcast completion event
        try:
            await ws_manager.broadcast_to_session(
                session_id,
                AgentEvent(
                    event_type=AgentEventType.AGENT_COMPLETED,
                    session_id=session_id,
                    agent_name="multimodal",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    message=f"Multimodal Vision analysis complete: {len(all_biomarkers)} analytes extracted" + (f", {len(all_alerts)} CRITICAL ALERTS" if all_alerts else "."),
                    data={
                        "biomarkers_count": len(all_biomarkers),
                        "critical_alerts": all_alerts,
                        "has_stemi": ecg_summary.get("is_stemi", False) if ecg_summary else False
                    }
                )
            )
        except Exception as ws_err:
            logger.warning("Failed to broadcast multimodal completion event", session_id=session_id, error=str(ws_err))

        logger.info(
            "MultimodalAgent complete",
            session_id=session_id,
            biomarker_count=len(all_biomarkers),
            critical_alert_count=len(all_alerts)
        )
        return state
