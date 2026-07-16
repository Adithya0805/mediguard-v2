"""
MediGuard V2 — Symptom Intelligence API Routes
Day 6: Smart Symptom Suggestion Endpoints

GET /api/v1/symptoms/suggest         — Related suggestions + autocomplete
GET /api/v1/symptoms/normalize       — Normalise a single symptom term
GET /api/v1/symptoms/cluster/{sym}   — Full cluster data for one symptom
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_current_staff
from app.services.symptom_suggester import symptom_suggester
from app.data.symptom_clusters import SYMPTOM_CLUSTERS
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.symptoms")
router = APIRouter()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get(
    "/suggest",
    summary="Get smart symptom suggestions for current symptom list",
    status_code=status.HTTP_200_OK,
)
async def get_suggestions(
    symptoms: str = Query(default="", description="Comma-separated current symptoms"),
    q: str = Query(default="", description="Partial input for autocomplete"),
    limit: int = Query(default=8, ge=1, le=20, description="Max suggestions to return"),
    current_staff=Depends(get_current_staff),
) -> dict:
    """
    Returns related symptoms, autocomplete options, clinical questions,
    urgency hint, and red flags for the given current symptom list.

    Pure in-memory lookup — response time < 5ms.
    """
    # Parse comma-separated symptom list
    symptom_list = [s.strip() for s in symptoms.split(",") if s.strip()] if symptoms else []

    suggestions = symptom_suggester.get_suggestions(
        current_symptoms=symptom_list,
        partial_input=q.strip(),
        max_suggestions=limit,
    )
    return suggestions


@router.get(
    "/normalize",
    summary="Normalize a clinical symptom term (resolve aliases)",
    status_code=status.HTTP_200_OK,
)
async def normalize_term(
    term: str = Query(..., min_length=1, description="The symptom term to normalize"),
    current_staff=Depends(get_current_staff),
) -> dict:
    """
    Resolves colloquial or aliased symptom terms to their clinical equivalents.
    e.g. "sweating" → "diaphoresis"
    """
    normalized, was_aliased = symptom_suggester.normalize_symptom(term)
    return {
        "input": term,
        "normalized": normalized,
        "was_aliased": was_aliased,
    }


@router.get(
    "/cluster/{symptom}",
    summary="Get full knowledge-base cluster for a specific symptom",
    status_code=status.HTTP_200_OK,
)
async def get_cluster(
    symptom: str,
    current_staff=Depends(get_current_staff),
) -> dict:
    """
    Returns the complete cluster entry for a symptom including:
    - related_symptoms
    - ask_about questions
    - red_flag_combinations
    - icd10_category
    - urgency_hint
    """
    key = symptom.strip().lower()
    cluster = SYMPTOM_CLUSTERS.get(key)
    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symptom '{symptom}' not found in knowledge base. Use /suggest?q= for autocomplete.",
        )
    return {"symptom": key, **cluster}
