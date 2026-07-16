"""
MediGuard V2 — Voice Intake API Routes
Day 6: Voice transcription parsing endpoints

POST /api/v1/voice/parse          — Full structured parse (JSON)
POST /api/v1/voice/parse-stream   — Streaming SSE parse (real-time progress)
"""

from __future__ import annotations

import time
import json
import asyncio
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from app.dependencies import get_current_staff
from app.services.voice_parser import ClinicalVoiceParser
from app.services.audit_service import AuditService
from app.db.supabase_client import get_supabase_client
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.voice")
router = APIRouter()


# ── Request / Response Schemas ────────────────────────────────────────────────

class SessionContext(BaseModel):
    existing_data: Optional[dict[str, Any]] = None


class VoiceParseRequest(BaseModel):
    transcript: str = Field(..., min_length=1)
    session_context: Optional[SessionContext] = None

    @field_validator("transcript")
    @classmethod
    def check_length(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 20:
            raise ValueError(
                "Transcript too short. Please speak more details about the patient."
            )
        if len(stripped) > 5000:
            raise ValueError("Transcript exceeds 5000 character limit.")
        return stripped


class VoiceParseResponse(BaseModel):
    parsed_data: dict[str, Any]
    extraction_confidence: float
    fields_extracted: list[str]
    fields_missing: list[str]
    parser_notes: str
    red_flags_detected: bool
    processing_time_ms: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/parse",
    response_model=VoiceParseResponse,
    summary="Parse clinical voice transcript into structured patient data",
    status_code=status.HTTP_200_OK,
)
async def parse_voice_transcript(
    body: VoiceParseRequest,
    current_staff=Depends(get_current_staff),
) -> VoiceParseResponse:
    """
    Receives a raw voice transcript spoken by a nurse/physician and returns
    structured PatientInput fields extracted by Claude Haiku.

    Optionally merges with existing form data so incremental voice additions
    are handled gracefully (existing non-empty fields win).
    """
    start = time.perf_counter()

    try:
        parser = ClinicalVoiceParser()

        # Primary parse
        parsed = await parser.parse_transcript(body.transcript)

        # Enhance with red flag checks and medication cleanup
        enhanced = await parser.validate_and_enhance(parsed, body.transcript)

        # Merge with existing form data if provided
        if body.session_context and body.session_context.existing_data:
            enhanced = ClinicalVoiceParser.merge_with_existing(
                enhanced, body.session_context.existing_data
            )

        elapsed_ms = int((time.perf_counter() - start) * 1000)

        # Audit log
        try:
            db = get_supabase_client()
            audit = AuditService(db)
            await audit.log_action(
                action="voice_intake_parsed",
                actor=str(getattr(current_staff, 'email', getattr(current_staff, 'staff_id', 'unknown'))),
                metadata={
                    "transcript_length": len(body.transcript),
                    "fields_extracted": enhanced.get("fields_extracted", []),
                    "confidence": enhanced.get("extraction_confidence", 0.0),
                    "red_flags": enhanced.get("red_flags_detected", False),
                    "processing_ms": elapsed_ms,
                },
            )
        except Exception as audit_err:
            logger.warning("Audit log failed for voice parse", error=str(audit_err))

        return VoiceParseResponse(
            parsed_data=enhanced,
            extraction_confidence=enhanced.get("extraction_confidence", 0.0),
            fields_extracted=enhanced.get("fields_extracted", []),
            fields_missing=enhanced.get("fields_missing", []),
            parser_notes=enhanced.get("parser_notes", ""),
            red_flags_detected=bool(enhanced.get("red_flags_detected", False)),
            processing_time_ms=elapsed_ms,
        )

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        logger.error("Voice parse endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice parsing failed: {str(e)}",
        )


@router.post(
    "/parse-stream",
    summary="Stream real-time parsing progress for voice transcript (SSE)",
    status_code=status.HTTP_200_OK,
)
async def parse_voice_stream(
    body: VoiceParseRequest,
    current_staff=Depends(get_current_staff),
) -> StreamingResponse:
    """
    Same as /parse but streams progress events via Server-Sent Events (SSE).
    Frontend can show field-by-field extraction progress in real time.
    """

    async def _event_generator():
        try:
            # Signal: parsing started
            yield _sse_event({"status": "parsing", "stage": "transcript_received", "message": "Processing voice transcript..."})
            await asyncio.sleep(0.05)

            parser = ClinicalVoiceParser()

            yield _sse_event({"status": "parsing", "stage": "extracting_demographics", "message": "Extracting patient demographics..."})
            await asyncio.sleep(0.1)

            yield _sse_event({"status": "parsing", "stage": "extracting_symptoms", "message": "Extracting symptoms and complaints..."})

            # Run the actual parse
            parsed = await parser.parse_transcript(body.transcript)

            yield _sse_event({"status": "parsing", "stage": "extracting_medications", "message": "Extracting medications and allergies..."})
            await asyncio.sleep(0.05)

            yield _sse_event({"status": "parsing", "stage": "extracting_vitals", "message": "Extracting vitals..."})

            # Enhance
            enhanced = await parser.validate_and_enhance(parsed, body.transcript)

            # Merge if existing data provided
            if body.session_context and body.session_context.existing_data:
                enhanced = ClinicalVoiceParser.merge_with_existing(
                    enhanced, body.session_context.existing_data
                )

            yield _sse_event({"status": "parsing", "stage": "red_flag_check", "message": "Checking for clinical red flags..."})
            await asyncio.sleep(0.05)

            # Final complete event
            yield _sse_event({
                "status": "complete",
                "result": enhanced,
                "extraction_confidence": enhanced.get("extraction_confidence", 0.0),
                "fields_extracted": enhanced.get("fields_extracted", []),
                "fields_missing": enhanced.get("fields_missing", []),
                "parser_notes": enhanced.get("parser_notes", ""),
                "red_flags_detected": bool(enhanced.get("red_flags_detected", False)),
            })

        except ValueError as ve:
            yield _sse_event({"status": "error", "message": str(ve)})
        except Exception as e:
            logger.error("Voice stream error", error=str(e))
            yield _sse_event({"status": "error", "message": f"Parsing error: {str(e)}"})

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


def _sse_event(data: dict) -> str:
    """Format a Server-Sent Event string."""
    return f"data: {json.dumps(data)}\n\n"
