"""
MediGuard V2 — Multimodal Clinical Schemas

Defines standardized Pydantic models for multimodal clinical data:
- Extracted lab biomarkers (with official LOINC codes, units, reference ranges, and panic status)
- 12-lead ECG & rhythm strip diagnostic analysis (rhythm, ST elevations, STEMI flags, QTc)
- Multimodal attachments (images, PDFs, clinical scans)
- Comprehensive multimodal analysis results and clinical presets
"""
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BiomarkerStatus(str, Enum):
    """Clinical status classification for a laboratory test value."""
    NORMAL = "normal"
    ABNORMAL_LOW = "abnormal_low"
    ABNORMAL_HIGH = "abnormal_high"
    CRITICAL_LOW = "critical_low"      # Medical emergency / panic value
    CRITICAL_HIGH = "critical_high"    # Medical emergency / panic value


class ExtractedBiomarker(BaseModel):
    """
    Standardized laboratory biomarker representation mapped to HL7/LOINC standards.
    """
    name: str = Field(..., description="Canonical name of the analyte (e.g., Troponin I, Potassium, Glucose)")
    value: float = Field(..., description="Numeric quantitative value extracted from the report")
    unit: str = Field(..., description="Measurement unit (e.g., ng/mL, mEq/L, mg/dL, mmol/L)")
    reference_range: str = Field(..., description="Normal reference interval (e.g., '3.5 - 5.0 mEq/L')")
    status: BiomarkerStatus = Field(default=BiomarkerStatus.NORMAL, description="Analyte status relative to reference intervals")
    loinc_code: Optional[str] = Field(default=None, description="Official LOINC identifier for FHIR R4 interoperability")
    criticality_flag: bool = Field(default=False, description="True if value breaches life-threatening panic threshold")
    clinical_interpretation: Optional[str] = Field(default=None, description="Concise clinical significance of this result")


class ECGAnalysis(BaseModel):
    """
    Automated diagnostic interpretation of a 12-lead ECG or telemetry rhythm strip.
    """
    rhythm: str = Field(..., description="Cardiac rhythm classification (e.g., 'Normal Sinus Rhythm', 'Atrial Fibrillation')")
    heart_rate_bpm: Optional[int] = Field(default=None, description="Ventricular rate in beats per minute")
    st_elevation_detected: bool = Field(default=False, description="True if significant ST-segment elevation is detected")
    st_elevation_leads: List[str] = Field(default_factory=list, description="Contiguous anatomical leads showing ST elevation (e.g., ['V1', 'V2', 'V3', 'V4'])")
    qtc_ms: Optional[int] = Field(default=None, description="Corrected QT interval in milliseconds")
    pr_interval_ms: Optional[int] = Field(default=None, description="PR interval in milliseconds")
    qrs_duration_ms: Optional[int] = Field(default=None, description="QRS complex duration in milliseconds")
    is_stemi: bool = Field(default=False, description="True if criteria for ST-Elevation Myocardial Infarction are met")
    pathological_findings: List[str] = Field(default_factory=list, description="List of recognized electrocardiographic anomalies")
    confidence_score: float = Field(default=0.90, ge=0.0, le=1.0, description="Algorithmic confidence in ECG interpretation")


class MultimodalAttachment(BaseModel):
    """
    Uploaded clinical image, document, or scan associated with patient intake.
    """
    filename: str = Field(..., description="Original filename of the attachment")
    content_type: str = Field(default="image/jpeg", description="MIME type (e.g., image/png, image/jpeg, application/pdf)")
    modality: str = Field(
        default="lab_panel",
        description="Clinical modality: 'lab_panel', 'ecg_strip', 'radiology_report', 'clinical_document'"
    )
    base64_data: Optional[str] = Field(default=None, description="Base64-encoded file payload (excluding header prefix)")
    description: Optional[str] = Field(default=None, description="Optional clinician context or caption")


class MultimodalAnalysisResult(BaseModel):
    """
    Aggregated output from multimodal vision analysis of laboratory panels, ECGs, or reports.
    """
    modality: str = Field(..., description="Detected or specified modality")
    document_type: str = Field(..., description="Document classification (e.g., 'Comprehensive Metabolic Panel', '12-Lead ECG')")
    confidence: float = Field(default=0.92, ge=0.0, le=1.0, description="Overall extraction confidence score")
    extracted_biomarkers: List[ExtractedBiomarker] = Field(default_factory=list, description="Structured quantitative lab analytes")
    ecg_interpretation: Optional[ECGAnalysis] = Field(default=None, description="ECG rhythm and ischemic findings if applicable")
    critical_alerts: List[str] = Field(default_factory=list, description="Urgent medical red flags extracted from the media")
    urgency_impact: str = Field(default="none", description="Impact on patient triage urgency: 'none', 'high', 'critical'")
    clinical_summary: str = Field(..., description="Physician-facing synthesis of all multimodal findings")


class MultimodalAnalyzeRequest(BaseModel):
    """API request payload for analyzing a clinical image or document."""
    base64_data: str = Field(..., description="Base64-encoded image or document bytes")
    filename: Optional[str] = Field(default="clinical_image.jpg", description="Original filename")
    content_type: Optional[str] = Field(default="image/jpeg", description="MIME type")
    modality_hint: Optional[str] = Field(default=None, description="Optional hint: 'lab_panel', 'ecg_strip', etc.")
    session_id: Optional[str] = Field(default=None, description="Optional patient session ID to auto-bind findings")


class MultimodalPreset(BaseModel):
    """Preconfigured high-fidelity clinical demo case for testing and evaluation."""
    id: str = Field(..., description="Unique preset identifier")
    title: str = Field(..., description="Human-readable title")
    description: str = Field(..., description="Clinical scenario description")
    modality: str = Field(..., description="Modality category")
    chief_complaint: str = Field(..., description="Associated patient chief complaint")
    sample_biomarkers: List[ExtractedBiomarker] = Field(default_factory=list)
    sample_ecg: Optional[ECGAnalysis] = Field(default=None)
    urgency_level: str = Field(default="medium")
