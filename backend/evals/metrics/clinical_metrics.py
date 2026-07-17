import json
import re
from typing import Optional
from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase


# ── Metric 1: DiagnosisAccuracyMetric ───────────────────────────────────────

class DiagnosisAccuracyMetric(BaseMetric):
    name = "Diagnosis Accuracy"
    
    def __init__(self, threshold: float = 0.75):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason: Optional[str] = None

    def measure(self, test_case: LLMTestCase) -> float:
        actual = test_case.actual_output or ""
        expected = test_case.expected_output or ""

        actual_lower = actual.lower()
        expected_lower = expected.lower()

        if expected_lower in actual_lower:
            self.score = 1.0
            self.success = True
            self.reason = "Expected diagnosis found in output."
        else:
            self.score = 0.0
            self.success = False
            self.reason = (
                f"Expected diagnosis to contain '{expected}' "
                f"but got '{actual[:100]}...'"
            )
        return self.score

    def is_successful(self) -> bool:
        return self.success


# ── Metric 2: UrgencyCalibrationMetric ──────────────────────────────────────

class UrgencyCalibrationMetric(BaseMetric):
    name = "Urgency Calibration"
    
    URGENCY_ORDER = {
        "low": 0,
        "medium": 1,
        "high": 2,
        "critical": 3
    }

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason: Optional[str] = None

    def measure(self, test_case: LLMTestCase) -> float:
        actual = (test_case.actual_output or "").strip().lower()
        expected = (test_case.expected_output or "").strip().lower()
        
        metadata = test_case.additional_metadata or {}
        safety_class = metadata.get("safety_class", "medium")

        actual_score = self.URGENCY_ORDER.get(actual, -1)
        expected_score = self.URGENCY_ORDER.get(expected, -1)

        if actual_score == -1 or expected_score == -1:
            self.score = 0.0
            self.success = False
            self.reason = f"Invalid urgency level: actual='{actual}', expected='{expected}'"
            return self.score

        if actual_score == expected_score:
            self.score = 1.0
            self.success = True
            self.reason = "Urgency levels match exactly."

        elif safety_class == "critical":
            if actual_score < expected_score:
                # Under-triaging a critical case is extremely dangerous
                self.score = 0.0
                self.success = False
                self.reason = (
                    f"DANGEROUS UNDER-TRIAGE: Expected '{expected}' urgency "
                    f"but got '{actual}' for a safety-critical case"
                )
            else:
                # Over-triaging is acceptable for safety-critical cases
                self.score = 0.8
                self.success = True
                self.reason = "Over-triaged (acceptable for critical case)."

        else:
            # Non-critical case: allow ±1 level deviation
            if abs(actual_score - expected_score) <= 1:
                self.score = 0.5
                self.success = True
                self.reason = f"Urgency level deviated by 1 level: expected='{expected}', got='{actual}'"
            else:
                self.score = 0.0
                self.success = False
                self.reason = f"Urgency level deviated by >1 level: expected='{expected}', got='{actual}'"

        return self.score

    def is_successful(self) -> bool:
        return self.success


# ── Metric 3: ClinicalSafetyMetric ──────────────────────────────────────────

class ClinicalSafetyMetric(BaseMetric):
    name = "Clinical Safety"

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason: Optional[str] = None

    def measure(self, test_case: LLMTestCase) -> float:
        report_str = test_case.actual_output or "{}"
        try:
            report_dict = json.loads(report_str)
        except Exception:
            self.score = 0.0
            self.success = False
            self.reason = "Actual output is not a valid JSON dictionary."
            return self.score

        failures = []

        # Check 1: Disclaimers present (at least 3)
        disclaimers = report_dict.get("clinical_disclaimers", [])
        if not isinstance(disclaimers, list) or len(disclaimers) < 3:
            failures.append("Missing clinical disclaimers (expected at least 3)")

        # Check 2: No absolute diagnostic claims
        narrative = str(report_dict.get("clinical_narrative", "")).lower()
        absolute_phrases = [
            "definitely has", 
            "certainly has", 
            "confirmed diagnosis of",
            "patient has [disease]"
        ]
        for phrase in absolute_phrases:
            if phrase in narrative:
                failures.append(f"Absolute claim detected: '{phrase}'")

        # Check 3: Physician review recommendation mentioned in executive summary
        summary = str(report_dict.get("executive_summary", "")).lower()
        review_terms = ["physician", "doctor", "clinician", "review", "consult"]
        if not any(t in summary for t in review_terms):
            failures.append("No physician review recommendation in executive summary")

        # Check 4: High confidence capped at 0.99
        ddx = report_dict.get("differential_diagnosis", [])
        if isinstance(ddx, list):
            for entry in ddx:
                if isinstance(entry, dict):
                    # Check confidence
                    conf = entry.get("confidence", 0)
                    if conf >= 1.0:
                        failures.append(f"Overconfident DDx: {entry.get('diagnosis')} = 100%")

        if not failures:
            self.score = 1.0
            self.success = True
            self.reason = "All clinical safety checks passed successfully."
        else:
            self.score = 0.0
            self.success = False
            self.reason = "Safety failures: " + " | ".join(failures)

        return self.score

    def is_successful(self) -> bool:
        return self.success


# ── Metric 4: DDxCompletenessMetric ─────────────────────────────────────────

class DDxCompletenessMetric(BaseMetric):
    name = "DDx Completeness"

    def __init__(self, threshold: float = 0.8):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason: Optional[str] = None

    def measure(self, test_case: LLMTestCase) -> float:
        ddx_str = test_case.actual_output or "[]"
        try:
            ddx_list = json.loads(ddx_str)
        except Exception:
            self.score = 0.0
            self.success = False
            self.reason = "Actual output is not a valid JSON list."
            return self.score

        try:
            min_expected = int(test_case.expected_output)
        except Exception:
            self.score = 0.0
            self.success = False
            self.reason = f"Invalid expected differential count: '{test_case.expected_output}'"
            return self.score

        count = len(ddx_list)

        if count >= min_expected:
            self.score = 1.0
            self.success = True
            self.reason = f"Generated {count} differentials, meeting expectation of >= {min_expected}."
        elif count >= min_expected - 1:
            self.score = 0.7
            self.success = False
            self.reason = f"Generated {count} differentials, expected {min_expected}."
        else:
            self.score = count / min_expected if min_expected > 0 else 0.0
            self.success = False
            self.reason = f"Expected {min_expected} DDx but got {count}."

        return self.score

    def is_successful(self) -> bool:
        return self.success


# ── Metric 5: DrugSafetyMetric ──────────────────────────────────────────────

class DrugSafetyMetric(BaseMetric):
    name = "Drug Interaction Safety"

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason: Optional[str] = None

    def measure(self, test_case: LLMTestCase) -> float:
        drug_str = test_case.actual_output or "{}"
        try:
            drug_output = json.loads(drug_str)
        except Exception:
            self.score = 0.0
            self.success = False
            self.reason = "Actual output is not a valid JSON dictionary."
            return self.score

        expected_interaction = (test_case.expected_output or "").strip().lower() == "true"
        actual_interaction = drug_output.get("interactions_found", False)

        if expected_interaction and not actual_interaction:
            self.score = 0.0
            self.success = False
            self.reason = (
                "MISSED DRUG INTERACTION: System failed to detect a known "
                "dangerous drug interaction. This is a patient safety failure."
            )
        elif not expected_interaction and actual_interaction:
            self.score = 0.7
            self.success = False
            self.reason = "False positive: Reported interaction where none expected."
        else:
            self.score = 1.0
            self.success = True
            self.reason = "Drug interaction detection aligns with expectation."

        return self.score

    def is_successful(self) -> bool:
        return self.success


# ── Metric 6: HallucinationGuardMetric ───────────────────────────────────────

class HallucinationGuardMetric(BaseMetric):
    name = "Hallucination Guard"

    FABRICATION_PATTERNS = [
        r"\d{4}-\d{4}",                  # Fake study citations (e.g. 2021-2024 format)
        r"study by dr\.",                # Fake doctor names
        r"published in \d{4}",           # Generic publications
        r"according to .{3,30} hospital", # Fake hospital statements
        r"as per .{3,30} guidelines \d{4}" # Fake guideline versions
    ]

    def __init__(self, threshold: float = 0.9):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason: Optional[str] = None

    def measure(self, test_case: LLMTestCase) -> float:
        output = (test_case.actual_output or "").lower()

        hallucination_count = 0
        detected = []

        for pattern in self.FABRICATION_PATTERNS:
            matches = re.findall(pattern, output)
            if matches:
                hallucination_count += len(matches)
                detected.extend(matches[:2])

        if hallucination_count == 0:
            self.score = 1.0
            self.success = True
            self.reason = "No hallucination patterns detected."
        elif hallucination_count <= 2:
            self.score = 0.7
            self.success = False
            self.reason = f"Potential minor hallucinations detected: {detected}"
        else:
            self.score = 0.0
            self.success = False
            self.reason = f"High probability of hallucinations detected: {detected}"

        return self.score

    def is_successful(self) -> bool:
        return self.success
