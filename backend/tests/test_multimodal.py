"""
MediGuard V2 — Multimodal Clinical Vision & Lab Intake Tests

Comprehensive test suite verifying:
- Analyte reference range evaluation and Joint Commission critical panic values
- Official LOINC standard code mapping
- 12-lead ECG ischemic ST-elevation and STEMI detection
- MultimodalAgent intake processing, vitals enrichment, and urgency escalation
- FHIR R4 LOINC Observation resource generation
- PDF report generation with diagnostic biomarker tables
- Multimodal REST API endpoints
"""
import base64
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.schemas.multimodal import BiomarkerStatus, ExtractedBiomarker, ECGAnalysis
from app.services.multimodal_service import multimodal_service, CLINICAL_ANALYTE_STANDARDS
from app.agents.multimodal_agent import MultimodalAgent
from app.schemas.agent import build_initial_state
from app.services.fhir_service import FHIRBundleGenerator
from app.services.pdf_service import ClinicalPDFGenerator


# ── Test Suite 1: MultimodalService & Clinical Standards ────────────────────

class TestMultimodalService:
    """Tests for biomarker evaluation and deterministic parser."""

    def test_evaluate_biomarker_normal(self):
        """Values within reference ranges should be marked NORMAL."""
        status, is_crit, unit, ref, loinc = multimodal_service.evaluate_biomarker("Troponin I", 0.02)
        assert status == BiomarkerStatus.NORMAL
        assert is_crit is False
        assert unit == "ng/mL"
        assert loinc == "10839-9"

        status_k, is_crit_k, unit_k, _, loinc_k = multimodal_service.evaluate_biomarker("Potassium", 4.2)
        assert status_k == BiomarkerStatus.NORMAL
        assert is_crit_k is False
        assert unit_k == "mEq/L"
        assert loinc_k == "2823-3"

    def test_evaluate_biomarker_critical_panic_values(self):
        """Values breaching life-threatening thresholds must be marked CRITICAL with panic flags."""
        # Troponin I > 0.40 ng/mL
        status_trop, is_crit_trop, _, _, _ = multimodal_service.evaluate_biomarker("Troponin I", 4.82)
        assert status_trop == BiomarkerStatus.CRITICAL_HIGH
        assert is_crit_trop is True

        # Potassium > 6.0 mEq/L
        status_k, is_crit_k, _, _, _ = multimodal_service.evaluate_biomarker("Potassium", 6.8)
        assert status_k == BiomarkerStatus.CRITICAL_HIGH
        assert is_crit_k is True

        # Potassium < 2.8 mEq/L
        status_low_k, is_crit_low_k, _, _, _ = multimodal_service.evaluate_biomarker("Potassium", 2.4)
        assert status_low_k == BiomarkerStatus.CRITICAL_LOW
        assert is_crit_low_k is True

        # Blood Glucose > 400 mg/dL (DKA)
        status_glu, is_crit_glu, _, _, _ = multimodal_service.evaluate_biomarker("Glucose", 495.0)
        assert status_glu == BiomarkerStatus.CRITICAL_HIGH
        assert is_crit_glu is True

        # Lactate > 4.0 mmol/L (Septic Shock)
        status_lac, is_crit_lac, _, _, loinc_lac = multimodal_service.evaluate_biomarker("Lactate", 5.4)
        assert status_lac == BiomarkerStatus.CRITICAL_HIGH
        assert is_crit_lac is True
        assert loinc_lac == "2524-7"

    def test_ecg_stemi_detection(self):
        """12-Lead ECG text containing ST-elevation in contiguous leads must trigger STEMI and critical urgency."""
        ecg_text = "12-Lead ECG: Sinus Tachycardia at 108 bpm. Marked ST elevation in leads V1, V2, V3, V4, and aVL."
        result = multimodal_service._heuristic_clinical_parser(ecg_text, "ecg_strip.png", modality_hint="ecg_strip")

        assert result.modality == "ecg_strip"
        assert result.ecg_interpretation is not None
        assert result.ecg_interpretation.is_stemi is True
        assert result.urgency_impact == "critical"
        assert "V1" in result.ecg_interpretation.st_elevation_leads
        assert "V2" in result.ecg_interpretation.st_elevation_leads
        assert len(result.critical_alerts) >= 1

    def test_heuristic_parser_tabular_labs(self):
        """Parsing tabular laboratory report text should extract all standard analytes."""
        lab_text = """
        METABOLIC PANEL:
        Sodium: 138 mEq/L
        Potassium: 6.9 mEq/L
        Glucose: 104 mg/dL
        BUN: 86 mg/dL
        Creatinine: 6.4 mg/dL
        Lactate: 1.2 mmol/L
        """
        result = multimodal_service._heuristic_clinical_parser(lab_text, "labs.txt", modality_hint="lab_panel")

        assert len(result.extracted_biomarkers) >= 5
        names = {b.name for b in result.extracted_biomarkers}
        assert "Potassium" in names
        assert "Creatinine" in names
        assert "BUN (Blood Urea Nitrogen)" in names

        # Potassium 6.9 and Creatinine 6.4 should be flagged as critical
        potassium_bm = next(b for b in result.extracted_biomarkers if b.name == "Potassium")
        assert potassium_bm.criticality_flag is True
        assert potassium_bm.status == BiomarkerStatus.CRITICAL_HIGH
        assert result.urgency_impact == "critical"

    def test_clinical_presets_catalog(self):
        """All 5 clinical presets should be registered and valid."""
        presets = multimodal_service.get_clinical_presets()
        assert len(presets) == 5
        preset_ids = {p.id for p in presets}
        assert "acute_stemi_ecg" in preset_ids
        assert "dka_chem_panel" in preset_ids
        assert "septic_shock_panel" in preset_ids
        assert "hyperkalemia_aki" in preset_ids
        assert "pulmonary_embolism_panel" in preset_ids

        # STEMI preset verification
        stemi_preset = next(p for p in presets if p.id == "acute_stemi_ecg")
        assert stemi_preset.sample_ecg is not None
        assert stemi_preset.sample_ecg.is_stemi is True
        assert any(b.name == "Troponin I" for b in stemi_preset.sample_biomarkers)


# ── Test Suite 2: MultimodalAgent Execution & State Enrichment ──────────────

class TestMultimodalAgent:
    """Tests for the MultimodalAgent pipeline integration."""

    @pytest.mark.asyncio
    async def test_multimodal_agent_no_attachments_bypasses(self):
        """If no attachments or preset present, state is passed through safely."""
        mock_router = MagicMock()
        mock_retriever = MagicMock()
        agent = MultimodalAgent(mock_router, mock_retriever)

        state = build_initial_state("session-123", {
            "patient_name": "Test Patient",
            "patient_age": 45,
            "patient_gender": "female",
            "chief_complaint": "Mild cough",
            "symptoms": ["cough"],
            "vitals": {"bp": "120/80"}
        })

        updated_state = await agent.run(state)
        assert updated_state["multimodal_data"] == {}
        assert updated_state["critical_biomarkers"] == []
        assert updated_state["urgency_level"] == "medium"

    @pytest.mark.asyncio
    async def test_multimodal_agent_with_stemi_preset(self):
        """Loading the STEMI preset should enrich vitals, set critical biomarkers, and escalate urgency to critical."""
        mock_router = MagicMock()
        mock_retriever = MagicMock()
        agent = MultimodalAgent(mock_router, mock_retriever)

        state = build_initial_state("session-stemi-999", {
            "patient_name": "Emergency Cardiac Patient",
            "patient_age": 62,
            "patient_gender": "male",
            "chief_complaint": "Severe retrosternal chest tightness",
            "symptoms": ["chest pain", "shortness of breath", "diaphoresis"],
            "vitals": {"bp": "148/92"},
            "multimodal_preset_id": "acute_stemi_ecg"
        })

        updated_state = await agent.run(state)

        # Critical escalation
        assert updated_state["urgency_level"] == "critical"
        assert len(updated_state["critical_biomarkers"]) >= 1

        # Vitals enriched
        vitals = updated_state["patient_data"]["vitals"]
        assert "troponin_i" in vitals
        assert vitals["heart_rate"] == 108

        # Multimodal data populated
        mm = updated_state["multimodal_data"]
        assert mm["has_critical_findings"] is True
        assert mm["ecg_interpretation"]["is_stemi"] is True
        assert len(mm["critical_alerts"]) >= 1

    @pytest.mark.asyncio
    async def test_multimodal_agent_with_dka_preset(self):
        """Loading the DKA preset should extract glucose and bicarbonate panic values."""
        mock_router = MagicMock()
        mock_retriever = MagicMock()
        agent = MultimodalAgent(mock_router, mock_retriever)

        state = build_initial_state("session-dka-101", {
            "patient_name": "DKA Patient",
            "patient_age": 24,
            "patient_gender": "female",
            "chief_complaint": "Vomiting and confusion",
            "symptoms": ["vomiting", "confusion", "polyuria"],
            "multimodal_preset_id": "dka_chem_panel"
        })

        updated_state = await agent.run(state)

        assert updated_state["urgency_level"] == "critical"
        crit_names = {b["name"] for b in updated_state["critical_biomarkers"]}
        assert "Glucose" in crit_names
        assert "Bicarbonate (CO2)" in crit_names


# ── Test Suite 3: FHIR & PDF Multimodal Integration ─────────────────────────

class TestFHIRAndPDFMultimodalIntegration:
    """Verifies that multimodal biomarkers correctly flow into FHIR LOINC Observations and PDFs."""

    def test_fhir_observation_generation_with_loinc(self):
        """Extracted laboratory biomarkers in vitals should be converted into LOINC-mapped FHIR Observations."""
        generator = FHIRBundleGenerator()

        patient_data = {
            "patient_name": "Cardiac Patient",
            "patient_age": 58,
            "patient_gender": "male",
            "vitals": {
                "bp": "130/85",
                "heart_rate": 96,
                "troponin_i": "4.82 ng/mL",
                "potassium": "6.8 mEq/L"
            }
        }

        report_data = {
            "differential_diagnosis": [{
                "rank": 1,
                "diagnosis": "Acute Myocardial Infarction",
                "icd10_code": "I21.0",
                "confidence": 0.95
            }]
        }

        bundle = generator.generate_bundle(report_data, patient_data, "session-fhir-001")
        assert bundle["resourceType"] == "Bundle"

        observations = [
            e["resource"] for e in bundle.get("entry", [])
            if e.get("resource", {}).get("resourceType") == "Observation"
        ]
        assert len(observations) >= 4

        # Check for Troponin LOINC code
        trop_obs = next(
            (o for o in observations if o.get("code", {}).get("coding", [{}])[0].get("code") == "10839-9"),
            None
        )
        assert trop_obs is not None
        assert trop_obs["category"][0]["coding"][0]["code"] == "laboratory"

        # Check for Potassium LOINC code
        k_obs = next(
            (o for o in observations if o.get("code", {}).get("coding", [{}])[0].get("code") == "2823-3"),
            None
        )
        assert k_obs is not None

    def test_pdf_generation_with_multimodal(self):
        """ClinicalPDFGenerator should compile a valid PDF containing multimodal diagnostic biomarkers."""
        pdf_gen = ClinicalPDFGenerator()

        patient_data = {
            "patient_name": "STEMI Case",
            "patient_age": 62,
            "patient_gender": "male",
            "chief_complaint": "Acute chest pain",
            "vitals": {"bp": "140/90", "heart_rate": 105}
        }

        report_data = {
            "urgency_level": "critical",
            "urgency_assessment": "Immediate PCI catheterization indicated.",
            "executive_summary": "Patient presenting with acute STEMI and elevated troponin.",
            "differential_diagnosis": [{
                "rank": 1,
                "diagnosis": "ST-Elevation Myocardial Infarction",
                "icd10_code": "I21.0",
                "confidence": 0.98,
                "urgency": "immediate"
            }],
            "multimodal_data": {
                "biomarkers": [{
                    "name": "Troponin I",
                    "value": 4.82,
                    "unit": "ng/mL",
                    "reference_range": "0.00 - 0.04 ng/mL",
                    "status": "critical_high",
                    "loinc_code": "10839-9",
                    "criticality_flag": True,
                    "clinical_interpretation": "Critical myocardial necrosis marker."
                }],
                "ecg_interpretation": {
                    "rhythm": "Sinus Tachycardia",
                    "heart_rate_bpm": 105,
                    "st_elevation_detected": True,
                    "st_elevation_leads": ["V1", "V2", "V3", "V4"],
                    "is_stemi": True
                }
            }
        }

        pdf_bytes = pdf_gen.generate_pdf(report_data, patient_data, "session-pdf-001")
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 2000
        # Valid PDF signature
        assert pdf_bytes.startswith(b"%PDF-")


# ── Test Suite 4: Multimodal REST API Endpoints ──────────────────────────────

class TestMultimodalAPI:
    """Verifies FastAPI endpoints for multimodal media analysis and presets."""

    @pytest.mark.asyncio
    async def test_list_presets(self, ac):
        """GET /api/v1/multimodal/presets should return all 5 clinical presets."""
        response = await ac.get("/api/v1/multimodal/presets")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
        titles = [p["title"] for p in data]
        assert any("STEMI" in t for t in titles)

    @pytest.mark.asyncio
    async def test_get_single_preset(self, ac):
        """GET /api/v1/multimodal/presets/acute_stemi_ecg should return preset details."""
        response = await ac.get("/api/v1/multimodal/presets/acute_stemi_ecg")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "acute_stemi_ecg"
        assert data["sample_ecg"]["is_stemi"] is True

    @pytest.mark.asyncio
    async def test_get_preset_not_found(self, ac):
        """GET /api/v1/multimodal/presets/invalid_id should return 404."""
        response = await ac.get("/api/v1/multimodal/presets/invalid_id")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_analyze_media_endpoint(self, ac):
        """POST /api/v1/multimodal/analyze with base64 text should return extracted biomarkers."""
        sample_lab_text = "Troponin I: 4.82 ng/mL\nPotassium: 6.8 mEq/L"
        b64_data = base64.b64encode(sample_lab_text.encode("utf-8")).decode("utf-8")

        response = await ac.post(
            "/api/v1/multimodal/analyze",
            json={
                "base64_data": b64_data,
                "filename": "emergency_labs.txt",
                "content_type": "text/plain",
                "modality_hint": "lab_panel"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["extracted_biomarkers"]) >= 2
        assert data["urgency_impact"] == "critical"
