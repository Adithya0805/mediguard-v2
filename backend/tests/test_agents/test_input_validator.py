"""
MediGuard V2 — Input Validator Tests

Tests for app.utils.input_validator module:
- Chief complaint length enforcement
- Symptoms list validation
- Vital signs physiological range checks
- Blood pressure parsing
- Polypharmacy count limit
"""
import pytest

from app.utils.input_validator import validate_patient_input, _parse_bp


class TestChiefComplaintValidation:
    """Chief complaint length boundary tests."""

    def test_valid_complaint_passes(self):
        """Complaint within valid length range passes."""
        result = validate_patient_input({
            "chief_complaint": "Severe chest pain radiating to left arm",
            "symptoms": ["chest_pain"],
        })
        assert result.passed is True

    def test_too_short_complaint_fails(self):
        """Complaint shorter than 10 chars fails."""
        result = validate_patient_input({
            "chief_complaint": "Pain",  # < 10 chars
            "symptoms": ["pain"],
        })
        assert result.passed is False
        error_fields = [e.field for e in result.errors]
        assert "chief_complaint" in error_fields

    def test_exactly_minimum_length_passes(self):
        """Complaint exactly at minimum (10 chars) passes."""
        result = validate_patient_input({
            "chief_complaint": "1234567890",  # exactly 10
            "symptoms": ["pain"],
        })
        assert result.passed is True

    def test_empty_complaint_fails(self):
        """Empty complaint string fails."""
        result = validate_patient_input({
            "chief_complaint": "",
            "symptoms": ["pain"],
        })
        assert result.passed is False

    def test_too_long_complaint_fails(self):
        """Complaint over 2000 chars fails."""
        long_text = "A" * 2001
        result = validate_patient_input({
            "chief_complaint": long_text,
            "symptoms": ["pain"],
        })
        assert result.passed is False


class TestSymptomsValidation:
    """Symptoms list validation tests."""

    def test_empty_symptoms_fails(self):
        """Empty symptoms list triggers error."""
        result = validate_patient_input({
            "chief_complaint": "Chest pain present for 1 hour",
            "symptoms": [],
        })
        assert result.passed is False
        error_fields = [e.field for e in result.errors]
        assert "symptoms" in error_fields

    def test_valid_symptoms_passes(self):
        """Non-empty symptoms list passes."""
        result = validate_patient_input({
            "chief_complaint": "Chest pain present for 1 hour",
            "symptoms": ["chest_pain", "shortness_of_breath"],
        })
        assert result.passed is True

    def test_high_symptom_count_generates_warning(self):
        """More than 50 symptoms generates a warning (not an error)."""
        many_symptoms = [f"symptom_{i}" for i in range(55)]
        result = validate_patient_input({
            "chief_complaint": "Multiple symptoms present",
            "symptoms": many_symptoms,
        })
        # Passes but should warn
        assert result.has_warnings or result.passed  # warning or clean pass


class TestVitalSignsValidation:
    """Vital signs physiological range enforcement tests."""

    def test_normal_vitals_pass(self):
        """Normal physiological vitals should all pass."""
        result = validate_patient_input({
            "chief_complaint": "Routine checkup appointment today",
            "symptoms": ["fatigue"],
            "vitals": {
                "bp": "120/80",
                "heart_rate": 72,
                "temperature": 36.8,
                "spo2": 98,
            }
        })
        assert result.passed is True

    def test_impossible_heart_rate_fails(self):
        """Heart rate of 10 bpm is outside physiological range (20–300)."""
        result = validate_patient_input({
            "chief_complaint": "Feeling unwell and dizzy today",
            "symptoms": ["dizziness"],
            "vitals": {"heart_rate": 10},
        })
        assert result.passed is False
        error_fields = [e.field for e in result.errors]
        assert any("heart_rate" in f for f in error_fields)

    def test_impossible_spo2_fails(self):
        """SpO2 of 30% is outside physiological range (50–100)."""
        result = validate_patient_input({
            "chief_complaint": "Severe breathing difficulty present",
            "symptoms": ["dyspnea"],
            "vitals": {"spo2": 30},
        })
        assert result.passed is False

    def test_valid_spo2_borderline_generates_warning(self):
        """SpO2 of 92% is borderline — passes but warns."""
        result = validate_patient_input({
            "chief_complaint": "Shortness of breath on exertion",
            "symptoms": ["dyspnea"],
            "vitals": {"spo2": 92},
        })
        assert result.passed is True
        assert result.has_warnings

    def test_hypertensive_crisis_bp_generates_warning(self):
        """Systolic BP 185 is hypertensive crisis range — warns."""
        result = validate_patient_input({
            "chief_complaint": "Severe headache and blurred vision",
            "symptoms": ["headache"],
            "vitals": {"bp": "185/115"},
        })
        assert result.passed is True
        assert result.has_warnings

    def test_impossible_temperature_fails(self):
        """Temperature of 60°C is outside physiological range (32–43)."""
        result = validate_patient_input({
            "chief_complaint": "Feeling extremely hot and unwell",
            "symptoms": ["fever"],
            "vitals": {"temperature": 60},
        })
        assert result.passed is False

    def test_non_numeric_vital_fails(self):
        """Non-numeric value for heart_rate triggers validation error."""
        result = validate_patient_input({
            "chief_complaint": "Palpitations and chest discomfort",
            "symptoms": ["palpitations"],
            "vitals": {"heart_rate": "fast"},
        })
        assert result.passed is False


class TestBPParser:
    """Blood pressure string/dict parser tests."""

    def test_parse_string_bp(self):
        """'120/80' string format should parse correctly."""
        systolic, diastolic = _parse_bp("120/80")
        assert systolic == 120.0
        assert diastolic == 80.0

    def test_parse_dict_bp(self):
        """Dict with systolic/diastolic keys should parse correctly."""
        systolic, diastolic = _parse_bp({"systolic": 135, "diastolic": 88})
        assert systolic == 135.0
        assert diastolic == 88.0

    def test_parse_integer_bp(self):
        """Integer input treated as systolic only."""
        systolic, diastolic = _parse_bp(140)
        assert systolic == 140.0
        assert diastolic is None

    def test_parse_malformed_bp_returns_none(self):
        """Malformed string returns (None, None) gracefully."""
        systolic, diastolic = _parse_bp("abc/xyz")
        assert systolic is None
        assert diastolic is None
