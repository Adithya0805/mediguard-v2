"""
MediGuard V2 — Clinical Safety Guardrail Tests

Tests for app.utils.clinical_safety module:
- Hallucination marker detection
- Refusal phrase detection
- Empty/short output handling
- DDx structural validation
- Polypharmacy detection
- Master validate_clinical_output composition
"""
import pytest

from app.utils.clinical_safety import (
    ClinicalSafetyError,
    SafetyValidationResult,
    check_polypharmacy,
    validate_clinical_output,
    validate_ddx_output,
    validate_text_output,
)


class TestTextOutputValidation:
    """validate_text_output() tests."""

    def test_clean_output_passes(self):
        """Normal clinical output should pass validation."""
        text = (
            "Based on the patient's presentation with severe chest pain, "
            "diaphoresis, and ST-elevation, the primary consideration is "
            "acute myocardial infarction requiring immediate cardiac catheterization."
        )
        result = validate_text_output("diagnosis_agent", text)
        assert result.passed is True
        assert len(result.violations) == 0

    def test_hallucination_marker_detected(self):
        """Output containing 'as an AI' should be flagged."""
        text = "As an AI, I cannot provide medical advice or diagnose conditions."
        result = validate_text_output("diagnosis_agent", text)
        assert result.passed is False
        assert any("as an ai" in v.lower() for v in result.violations)

    def test_refusal_phrase_detected(self):
        """Output containing refusal phrases should be flagged."""
        text = "I'm not able to assist with medical diagnoses in this context."
        result = validate_text_output("symptom_agent", text)
        assert result.passed is False

    def test_i_dont_know_flagged(self):
        """'I don't know' response should be caught."""
        text = "I don't know what is causing these symptoms."
        result = validate_text_output("intake_agent", text)
        assert result.passed is False

    def test_empty_output_raises(self):
        """Empty string output should raise ClinicalSafetyError."""
        with pytest.raises(ClinicalSafetyError) as exc_info:
            validate_text_output("diagnosis_agent", "")
        assert "empty output" in str(exc_info.value).lower()

    def test_short_output_generates_warning(self):
        """Very short output (< 50 chars) should pass but generate a warning."""
        text = "AMI suspected."  # < 50 chars
        result = validate_text_output("diagnosis_agent", text)
        assert result.passed is True
        assert result.has_warnings

    def test_cannot_diagnose_flagged(self):
        """'I cannot diagnose' phrasing should be caught."""
        text = "I cannot diagnose this patient based on the information provided."
        result = validate_text_output("diagnosis_agent", text)
        assert result.passed is False


class TestDDxOutputValidation:
    """validate_ddx_output() tests."""

    def test_valid_ddx_list_passes(self):
        """Properly structured DDx list should pass."""
        ddx = [
            {"diagnosis": "Acute MI", "confidence": 0.85, "icd10": "I21.9"},
            {"diagnosis": "Unstable Angina", "confidence": 0.60, "icd10": "I20.0"},
            {"diagnosis": "GERD", "confidence": 0.15, "icd10": "K21.0"},
        ]
        result = validate_ddx_output("diagnosis_agent", ddx)
        assert result.passed is True

    def test_empty_ddx_list_fails(self):
        """Empty DDx list should fail validation."""
        result = validate_ddx_output("diagnosis_agent", [])
        assert result.passed is False
        assert any("empty" in v.lower() for v in result.violations)

    def test_single_item_ddx_fails(self):
        """Only 1 DDx item fails minimum threshold of 2."""
        result = validate_ddx_output("diagnosis_agent", [
            {"diagnosis": "AMI", "confidence": 0.9}
        ])
        assert result.passed is False

    def test_missing_diagnosis_field(self):
        """DDx item without 'diagnosis' key should fail."""
        ddx = [
            {"icd10": "I21.9", "confidence": 0.9},
            {"diagnosis": "Angina", "confidence": 0.5},
        ]
        result = validate_ddx_output("diagnosis_agent", ddx)
        assert result.passed is False

    def test_low_confidence_generates_warning(self):
        """DDx confidence below 0.10 threshold should produce a warning."""
        ddx = [
            {"diagnosis": "AMI", "confidence": 0.9},
            {"diagnosis": "Rare condition", "confidence": 0.02},  # very low
        ]
        result = validate_ddx_output("diagnosis_agent", ddx)
        # Should pass (2 items) but warn on low confidence
        assert result.passed is True
        assert result.has_warnings


class TestPolypharmacyCheck:
    """check_polypharmacy() tests."""

    def test_no_flag_below_threshold(self):
        """4 medications is below threshold — no warning."""
        meds = ["warfarin", "metformin", "lisinopril", "aspirin"]
        result = check_polypharmacy("drug_agent", meds)
        assert result.passed is True
        assert not result.has_warnings

    def test_polypharmacy_flag_at_threshold(self):
        """5 medications triggers polypharmacy warning."""
        meds = ["warfarin", "metformin", "lisinopril", "aspirin", "furosemide"]
        result = check_polypharmacy("drug_agent", meds)
        assert result.passed is True  # Passes but warns
        assert result.has_warnings
        assert any("polypharmacy" in w.lower() for w in result.warnings)

    def test_polypharmacy_flag_well_above_threshold(self):
        """8 medications should definitely trigger polypharmacy warning."""
        meds = [
            "warfarin", "metformin", "lisinopril", "aspirin",
            "furosemide", "digoxin", "spironolactone", "atorvastatin"
        ]
        result = check_polypharmacy("drug_agent", meds)
        assert result.has_warnings

    def test_empty_medications_no_flag(self):
        """Empty medication list should not trigger polypharmacy."""
        result = check_polypharmacy("drug_agent", [])
        assert not result.has_warnings


class TestMasterValidation:
    """validate_clinical_output() composition tests."""

    def test_master_validator_passes_clean_input(self):
        """Clean text + valid DDx should pass master validation."""
        text = (
            "The patient presents with classic signs of ACS. "
            "Differential diagnosis prioritizes STEMI given ST elevation in V1-V4."
        )
        ddx = [
            {"diagnosis": "STEMI", "confidence": 0.90},
            {"diagnosis": "NSTEMI", "confidence": 0.50},
        ]
        result = validate_clinical_output("diagnosis_agent", output_text=text, ddx_list=ddx)
        assert result.passed is True

    def test_master_validator_fails_on_hallucination_text(self):
        """Master validator catches hallucination in text regardless of DDx."""
        text = "As an AI language model, I cannot make medical diagnoses."
        ddx = [
            {"diagnosis": "AMI", "confidence": 0.9},
            {"diagnosis": "Angina", "confidence": 0.5},
        ]
        result = validate_clinical_output("diagnosis_agent", output_text=text, ddx_list=ddx)
        assert result.passed is False

    def test_master_validator_raises_on_violation_when_configured(self):
        """With raise_on_violation=True, should raise ClinicalSafetyError."""
        text = "As an AI, I cannot provide this information."
        with pytest.raises(ClinicalSafetyError):
            validate_clinical_output(
                "diagnosis_agent",
                output_text=text,
                raise_on_violation=True,
            )

    def test_master_validator_collects_polypharmacy_warning(self):
        """Master validation with polypharmacy meds should include warning but pass."""
        text = "Patient has multiple chronic conditions requiring medication review."
        result = validate_clinical_output(
            "drug_agent",
            output_text=text,
            medications=["warfarin", "metformin", "lisinopril", "aspirin", "furosemide"],
        )
        # Text is clean so should pass, but polypharmacy warning included
        assert result.passed is True
        assert result.has_warnings
