"""
MediGuard V2 — Clinical Safety Guardrails

Validates LLM agent outputs for clinical safety compliance.
Catches hallucination markers, missing confidence data, and unsafe outputs
before they propagate into clinical reports.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

from app.utils.logger import get_logger

logger = get_logger("app.utils.clinical_safety")


# ── Hallucination / Unsafe output markers ─────────────────────────────────────

_HALLUCINATION_PHRASES = [
    "i don't know",
    "i do not know",
    "i cannot provide",
    "i am unable to",
    "as an ai",
    "as a language model",
    "i'm just an ai",
    "i'm not a doctor",
    "i cannot diagnose",
    "cannot make medical",
    "unable to make a diagnosis",
    "consult a doctor instead",
    "i apologize, but i",
    "i'm sorry, but i",
    "this is beyond my",
    "i lack the ability",
]

# Phrases that indicate output refused to engage clinically
_REFUSAL_PHRASES = [
    "i'm not able to assist",
    "i can't assist with",
    "i won't be able to",
    "that's outside my scope",
]

# Minimum required confidence for a valid DDx output (0.0 – 1.0 scale)
_MIN_DDX_CONFIDENCE = 0.10

# Minimum number of differential diagnoses expected from diagnosis agent
_MIN_DDX_COUNT = 2

# Polypharmacy threshold (number of concurrent medications)
_POLYPHARMACY_THRESHOLD = 5


# ── Exception classes ─────────────────────────────────────────────────────────

class ClinicalSafetyError(Exception):
    """Raised when a clinical agent output fails safety validation."""

    def __init__(self, agent_name: str, reason: str, flagged_text: str = "") -> None:
        self.agent_name   = agent_name
        self.reason       = reason
        self.flagged_text = flagged_text
        super().__init__(f"[CLINICAL SAFETY] Agent '{agent_name}' failed: {reason}")


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class SafetyValidationResult:
    """Structured result of a clinical safety validation pass."""
    agent_name:  str
    passed:      bool
    violations:  List[str]             = field(default_factory=list)
    warnings:    List[str]             = field(default_factory=list)
    flagged_text: Optional[str]        = None

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0

    def summary(self) -> str:
        if self.passed:
            status = "PASS"
        else:
            status = "FAIL"
        vcount = len(self.violations)
        wcount = len(self.warnings)
        return f"[{status}] {self.agent_name}: {vcount} violations, {wcount} warnings"


# ── Core validation functions ─────────────────────────────────────────────────

def validate_text_output(agent_name: str, text: str) -> SafetyValidationResult:
    """
    Scan a raw LLM text output for hallucination or refusal markers.

    Args:
        agent_name: Name of the agent producing this output (for logging).
        text:       Raw text output from LLM.

    Returns:
        SafetyValidationResult with passed=True if clean.

    Raises:
        ClinicalSafetyError if a critical hallucination marker is detected.
    """
    if not text or not text.strip():
        raise ClinicalSafetyError(
            agent_name,
            "Agent produced empty output",
            text,
        )

    text_lower = text.lower()
    violations: List[str] = []
    warnings:   List[str] = []

    # Check hallucination markers
    for phrase in _HALLUCINATION_PHRASES:
        if phrase in text_lower:
            violations.append(f"Hallucination marker detected: '{phrase}'")

    # Check refusal phrases
    for phrase in _REFUSAL_PHRASES:
        if phrase in text_lower:
            violations.append(f"Refusal phrase detected: '{phrase}'")

    # Warn on very short responses (likely incomplete)
    if len(text.strip()) < 50:
        warnings.append(f"Very short response ({len(text.strip())} chars) — may be incomplete")

    if violations:
        logger.warning(
            "Clinical safety violation detected in agent output",
            agent_name=agent_name,
            violations=violations,
            text_preview=text[:200],
        )
        return SafetyValidationResult(
            agent_name=agent_name,
            passed=False,
            violations=violations,
            warnings=warnings,
            flagged_text=text[:500],
        )

    if warnings:
        logger.warning(
            "Clinical safety warning in agent output",
            agent_name=agent_name,
            warnings=warnings,
        )

    logger.debug(
        "Clinical safety text validation passed",
        agent_name=agent_name,
        text_length=len(text),
    )
    return SafetyValidationResult(
        agent_name=agent_name,
        passed=True,
        warnings=warnings,
    )


def validate_ddx_output(agent_name: str, ddx_list: list) -> SafetyValidationResult:
    """
    Validate a differential diagnosis list for structural completeness.

    Args:
        agent_name: Calling agent name for logging.
        ddx_list:   List of DDx dicts (each should have 'diagnosis', 'confidence').

    Returns:
        SafetyValidationResult.
    """
    violations: List[str] = []
    warnings:   List[str] = []

    if not ddx_list:
        violations.append("DDx list is empty — agent produced no diagnoses")
        return SafetyValidationResult(
            agent_name=agent_name,
            passed=False,
            violations=violations,
        )

    if len(ddx_list) < _MIN_DDX_COUNT:
        violations.append(
            f"DDx list too short: {len(ddx_list)} items (minimum {_MIN_DDX_COUNT} required)"
        )

    for i, item in enumerate(ddx_list):
        if not isinstance(item, dict):
            violations.append(f"DDx item [{i}] is not a dict: {type(item).__name__}")
            continue

        if "diagnosis" not in item or not item["diagnosis"]:
            violations.append(f"DDx item [{i}] missing 'diagnosis' field")

        confidence = item.get("confidence", None)
        if confidence is not None:
            try:
                conf_float = float(confidence)
                if conf_float < _MIN_DDX_CONFIDENCE:
                    warnings.append(
                        f"DDx item [{i}] '{item.get('diagnosis', 'unknown')}' has very low confidence: {confidence}"
                    )
            except (ValueError, TypeError):
                warnings.append(f"DDx item [{i}] has non-numeric confidence: {confidence}")

    passed = len(violations) == 0
    if not passed:
        logger.warning(
            "DDx safety validation failed",
            agent_name=agent_name,
            violations=violations,
        )

    return SafetyValidationResult(
        agent_name=agent_name,
        passed=passed,
        violations=violations,
        warnings=warnings,
    )


def check_polypharmacy(agent_name: str, medications: list) -> SafetyValidationResult:
    """
    Check whether a patient is on polypharmacy (>= threshold concurrent drugs).

    Args:
        agent_name:  Calling agent name.
        medications: List of current medication strings.

    Returns:
        SafetyValidationResult (always passes, but adds warning if polypharmacy).
    """
    warnings: List[str] = []

    if len(medications) >= _POLYPHARMACY_THRESHOLD:
        warnings.append(
            f"Polypharmacy detected: {len(medications)} concurrent medications "
            f"(threshold: {_POLYPHARMACY_THRESHOLD}). "
            "Mandatory drug interaction review required."
        )
        logger.warning(
            "Polypharmacy flag raised",
            agent_name=agent_name,
            medication_count=len(medications),
            threshold=_POLYPHARMACY_THRESHOLD,
        )

    return SafetyValidationResult(
        agent_name=agent_name,
        passed=True,  # Polypharmacy is a warning, not a blocker
        warnings=warnings,
    )


def validate_clinical_output(
    agent_name: str,
    output_text: str = "",
    ddx_list: Optional[list] = None,
    medications: Optional[list] = None,
    raise_on_violation: bool = False,
) -> SafetyValidationResult:
    """
    Master clinical safety validation combining text, DDx, and polypharmacy checks.

    Args:
        agent_name:         Name of the agent producing output.
        output_text:        Raw LLM text output to scan.
        ddx_list:           Optional differential diagnosis list.
        medications:        Optional current medications list.
        raise_on_violation: If True, raises ClinicalSafetyError on failure.

    Returns:
        Combined SafetyValidationResult.

    Raises:
        ClinicalSafetyError if raise_on_violation=True and validation fails.
    """
    all_violations: List[str] = []
    all_warnings:   List[str] = []

    # 1. Text safety check
    if output_text:
        text_result = validate_text_output(agent_name, output_text)
        all_violations.extend(text_result.violations)
        all_warnings.extend(text_result.warnings)

    # 2. DDx structural check
    if ddx_list is not None:
        ddx_result = validate_ddx_output(agent_name, ddx_list)
        all_violations.extend(ddx_result.violations)
        all_warnings.extend(ddx_result.warnings)

    # 3. Polypharmacy check
    if medications is not None:
        poly_result = check_polypharmacy(agent_name, medications)
        all_warnings.extend(poly_result.warnings)

    passed = len(all_violations) == 0
    result = SafetyValidationResult(
        agent_name=agent_name,
        passed=passed,
        violations=all_violations,
        warnings=all_warnings,
    )

    logger.info(
        "Clinical safety validation complete",
        agent_name=agent_name,
        passed=passed,
        violation_count=len(all_violations),
        warning_count=len(all_warnings),
    )

    if not passed and raise_on_violation:
        raise ClinicalSafetyError(
            agent_name=agent_name,
            reason="; ".join(all_violations),
        )

    return result
