"""
MediGuard V2 — Multimodal Clinical Vision & Lab Intake API Routes

Provides endpoints for:
- Uploading and analyzing laboratory panel photos, PDFs, and 12-lead ECG rhythm strips
- Accessing standardized high-fidelity emergency clinical presets (STEMI, DKA, Sepsis, Hyperkalemia, PE)
- Attaching extracted multimodal biomarkers to active patient sessions
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_db, get_current_staff, TokenData
from app.schemas.multimodal import (
    MultimodalAnalyzeRequest,
    MultimodalAnalysisResult,
    MultimodalPreset
)
from app.services.multimodal_service import multimodal_service
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.multimodal")
router = APIRouter()


@router.post("/analyze", response_model=MultimodalAnalysisResult, status_code=status.HTTP_200_OK)
async def analyze_clinical_image_or_report(
    payload: MultimodalAnalyzeRequest,
    current_staff: TokenData = Depends(get_current_staff)
):
    """
    Analyzes an uploaded clinical laboratory panel, medical PDF, or 12-lead ECG rhythm strip.
    Extracts quantitative analytes with LOINC mappings, evaluates panic thresholds,
    and returns immediate ischemic/arrhythmic interpretation.
    """
    logger.info(
        "Handling multimodal clinical analysis request",
        filename=payload.filename,
        staff_id=current_staff.staff_id,
        session_id=payload.session_id
    )

    try:
        result = await multimodal_service.analyze_clinical_media(
            base64_data=payload.base64_data,
            filename=payload.filename or "clinical_image.jpg",
            content_type=payload.content_type or "image/jpeg",
            modality_hint=payload.modality_hint
        )
        return result
    except Exception as exc:
        logger.error("Failed to analyze multimodal clinical media", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical media analysis failed: {str(exc)}"
        )


@router.get("/presets", response_model=List[MultimodalPreset], status_code=status.HTTP_200_OK)
async def list_multimodal_clinical_presets():
    """
    Returns 5 pre-validated emergency clinical presets:
    - Acute Anterolateral STEMI (12-Lead ECG + Cardiac Troponin)
    - Severe Diabetic Ketoacidosis (Metabolic Lab Panel)
    - Septic Shock & Tissue Hypoperfusion (Lactate & CBC Panel)
    - Severe Hyperkalemia & Acute Renal Failure Panel
    - Acute Pulmonary Embolism (D-Dimer & Cardiac Biomarkers)
    """
    return multimodal_service.get_clinical_presets()


@router.get("/presets/{preset_id}", response_model=MultimodalPreset, status_code=status.HTTP_200_OK)
async def get_multimodal_clinical_preset(preset_id: str):
    """Fetches details of a specific clinical preset by identifier."""
    presets = {p.id: p for p in multimodal_service.get_clinical_presets()}
    if preset_id not in presets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clinical preset '{preset_id}' not found. Available: {list(presets.keys())}"
        )
    return presets[preset_id]


@router.post("/attach-preset/{session_id}", status_code=status.HTTP_200_OK)
async def attach_preset_to_session(
    session_id: UUID,
    preset_id: str,
    db: Client = Depends(get_db),
    current_staff: TokenData = Depends(get_current_staff)
):
    """
    Binds a clinical preset (e.g. STEMI ECG or DKA Lab Panel) to an existing patient session,
    enriching the patient's vitals and queuing multimodal biomarkers for the agent pipeline.
    """
    presets = {p.id: p for p in multimodal_service.get_clinical_presets()}
    if preset_id not in presets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clinical preset '{preset_id}' not found."
        )

    preset = presets[preset_id]
    logger.info("Attaching preset to session", session_id=session_id, preset_id=preset_id)

    # Fetch existing session to update vitals
    try:
        session_resp = db.table("patient_sessions").select("*").eq("id", str(session_id)).execute()
        if session_resp.data:
            current_vitals = session_resp.data[0].get("vitals") or {}
            for b in preset.sample_biomarkers:
                key = b.name.lower().replace(" ", "_")
                current_vitals[key] = f"{b.value} {b.unit}"
            if preset.sample_ecg and preset.sample_ecg.heart_rate_bpm:
                current_vitals["heart_rate"] = preset.sample_ecg.heart_rate_bpm

            db.table("patient_sessions").update({
                "vitals": current_vitals
            }).eq("id", str(session_id)).execute()
    except Exception as db_err:
        logger.warning("Could not persist preset to Supabase (possibly mock DB)", error=str(db_err))

    return {
        "session_id": str(session_id),
        "preset_id": preset_id,
        "preset_title": preset.title,
        "biomarkers_attached": len(preset.sample_biomarkers),
        "has_ecg": preset.sample_ecg is not None,
        "message": "Multimodal preset attached to session successfully."
    }
