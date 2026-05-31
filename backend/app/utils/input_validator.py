"""
MediGuard V2 — Deep Clinical Input Validator

Validates patient input vitals and clinical data beyond basic Pydantic
schema-level checks. Enforces physiologically plausible ranges.

Used by the intake agent and API layer for pre-pipeline validation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.utils.logger import get_logger

logger = get_logger("app.utils.input_validator")


# ── Physiological range constants ─────────────────────────────────────────────

_VITALS_RANGES = {
    "heart_rate":         (20,  300,  "bpm"),          # beats per minute
    "spo2":               (50,  100,  "%"),             # oxygen saturation
    "temperature":        (32.0, 43.0, "°C"),           # body temperature
    "respiratory_rate":   (5,   60,   "breaths/min"),   # respiratory rate
    "weight":             (0.5, 700,  "kg"),            # weight in kilograms
    "height":             (30,  280,  "cm"),            # height in centimeters
    "glucose":            (1,   55,   "mmol/L"),        # blood glucose
}

_BP_SYSTOLIC_RANGE  = (50,  300)   # mmHg
_BP_DIASTOLIC_RANGE = (20,  200)   # mmHg

_CHIEF_COMPLAINT_MIN_CHARS = 10
_CHIEF_COMPLAINT_MAX_CHARS = 2000

_MAX_SYMPTOMS_COUNT   = 50
_MAX_MEDICATIONS_COUNT = 100


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class FieldError:
    field:   str
    value:   Any
    message: str


@dataclass
class ValidationResult:
    """Structured result from clinical input validation."""
    passed:  bool
    errors:  List[FieldError] = field(default_factory=list)
    warnings: List[str]       = field(default_factory=list)

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0

    def to_dict(self) -> dict:
        return {
            "passed":   self.passed,
            "errors":   [{"field": e.field, "value": str(e.value), "message": e.message} for e in self.errors],
            "warnings": self.warnings,
        }

    @property
    def error_messages(self) -> List[str]:
        return [f"{e.field}: {e.message}" for e in self.errors]


# ── Core validator ────────────────────────────────────────────────────────────

def validate_patient_input(data: Dict[str, Any]) -> ValidationResult:
    """
    Deep clinical validation of a patient intake payload.

    Validates:
    - Chief complaint length
    - Symptoms list size
    - Medications list size
    - Vitals (heart rate, SpO2, temperature, respiratory rate, BP)

    Args:
        data: Dict representation of PatientInput.

    Returns:
        ValidationResult with errors and warnings.
    """
    errors:   List[FieldError] = []
    warnings: List[str]        = []

    # ── Chief complaint ──────────────────────────────────────────────────────
    complaint = data.get("chief_complaint", "")
    if isinstance(complaint, str):
        if len(complaint.strip()) < _CHIEF_COMPLAINT_MIN_CHARS:
            errors.append(FieldError(
                field="chief_complaint",
                value=complaint,
                message=f"Chief complaint must be at least {_CHIEF_COMPLAINT_MIN_CHARS} characters long.",
            ))
        elif len(complaint) > _CHIEF_COMPLAINT_MAX_CHARS:
            errors.append(FieldError(
                field="chief_complaint",
                value=f"{len(complaint)} chars",
                message=f"Chief complaint exceeds maximum of {_CHIEF_COMPLAINT_MAX_CHARS} characters.",
            ))

    # ── Symptoms ─────────────────────────────────────────────────────────────
    symptoms = data.get("symptoms", [])
    if isinstance(symptoms, list):
        if len(symptoms) == 0:
            errors.append(FieldError(
                field="symptoms",
                value=[],
                message="At least one symptom must be provided.",
            ))
        elif len(symptoms) > _MAX_SYMPTOMS_COUNT:
            warnings.append(
                f"Unusually high number of symptoms: {len(symptoms)}. "
                "Please verify this is not a data entry error."
            )

    # ── Medications ──────────────────────────────────────────────────────────
    medications = data.get("current_medications", [])
    if isinstance(medications, list) and len(medications) > _MAX_MEDICATIONS_COUNT:
        errors.append(FieldError(
            field="current_medications",
            value=len(medications),
            message=f"Medication count ({len(medications)}) exceeds maximum {_MAX_MEDICATIONS_COUNT}.",
        ))

    # ── Vitals ───────────────────────────────────────────────────────────────
    vitals = data.get("vitals", {})
    if isinstance(vitals, dict):
        _validate_vitals(vitals, errors, warnings)

    passed = len(errors) == 0

    if not passed:
        logger.warning(
            "Clinical input validation failed",
            errors=[e.message for e in errors],
            error_count=len(errors),
        )
    else:
        logger.debug(
            "Clinical input validation passed",
            warning_count=len(warnings),
        )

    return ValidationResult(passed=passed, errors=errors, warnings=warnings)


def _validate_vitals(
    vitals: Dict[str, Any],
    errors: List[FieldError],
    warnings: List[str],
) -> None:
    """Validate individual vital sign values against physiological ranges."""

    # ── Blood pressure ────────────────────────────────────────────────────────
    bp_raw = vitals.get("bp") or vitals.get("blood_pressure")
    if bp_raw:
        systolic, diastolic = _parse_bp(bp_raw)
        if systolic is not None:
            s_min, s_max = _BP_SYSTOLIC_RANGE
            if not (s_min <= systolic <= s_max):
                errors.append(FieldError(
                    field="vitals.bp.systolic",
                    value=systolic,
                    message=f"Systolic BP {systolic} mmHg is outside physiological range [{s_min}–{s_max}].",
                ))
            elif systolic >= 180:
                warnings.append(f"Hypertensive crisis range: systolic BP = {systolic} mmHg")
            elif systolic < 90:
                warnings.append(f"Hypotension detected: systolic BP = {systolic} mmHg")

        if diastolic is not None:
            d_min, d_max = _BP_DIASTOLIC_RANGE
            if not (d_min <= diastolic <= d_max):
                errors.append(FieldError(
                    field="vitals.bp.diastolic",
                    value=diastolic,
                    message=f"Diastolic BP {diastolic} mmHg is outside physiological range [{d_min}–{d_max}].",
                ))

    # ── Scalar vitals ─────────────────────────────────────────────────────────
    for field_name, (vmin, vmax, unit) in _VITALS_RANGES.items():
        raw_value = vitals.get(field_name)
        if raw_value is None:
            continue  # Optional vitals — skip if absent

        try:
            value = float(raw_value)
        except (ValueError, TypeError):
            errors.append(FieldError(
                field=f"vitals.{field_name}",
                value=raw_value,
                message=f"Non-numeric value for {field_name}: '{raw_value}'.",
            ))
            continue

        if not (vmin <= value <= vmax):
            errors.append(FieldError(
                field=f"vitals.{field_name}",
                value=value,
                message=f"{field_name} = {value} {unit} is outside physiological range [{vmin}–{vmax}].",
            ))

        # Clinical warnings for borderline values
        if field_name == "spo2" and 90 <= value < 94:
            warnings.append(f"SpO2 borderline hypoxia: {value}%")
        elif field_name == "spo2" and value < 90:
            warnings.append(f"CRITICAL: SpO2 severely low: {value}%")
        elif field_name == "heart_rate" and value >= 150:
            warnings.append(f"Severe tachycardia: HR = {value} bpm")
        elif field_name == "temperature" and value >= 39.0:
            warnings.append(f"Fever detected: {value}°C")
        elif field_name == "temperature" and value >= 40.5:
            warnings.append(f"CRITICAL: Hyperpyrexia: {value}°C")


def _parse_bp(bp_raw: Any) -> tuple[Optional[float], Optional[float]]:
    """
    Parse blood pressure from various formats:
    - "120/80" string
    - {"systolic": 120, "diastolic": 80} dict
    - 120 (systolic only)

    Returns (systolic, diastolic) or (None, None) on parse failure.
    """
    if isinstance(bp_raw, dict):
        try:
            systolic  = float(bp_raw.get("systolic", bp_raw.get("sys", 0)) or 0)
            diastolic = float(bp_raw.get("diastolic", bp_raw.get("dia", 0)) or 0)
            return systolic or None, diastolic or None
        except (ValueError, TypeError):
            return None, None

    if isinstance(bp_raw, str) and "/" in bp_raw:
        try:
            parts = bp_raw.split("/")
            return float(parts[0].strip()), float(parts[1].strip())
        except (ValueError, IndexError):
            return None, None

    if isinstance(bp_raw, (int, float)):
        try:
            return float(bp_raw), None
        except (ValueError, TypeError):
            pass

    return None, None
