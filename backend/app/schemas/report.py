from datetime import datetime
from uuid import UUID
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator


class ReportRequest(BaseModel):
    """API request payload triggering multi-agent workflow analysis for a patient session."""
    session_id: UUID = Field(..., description="Target patient session UUID to execute agents against")


class DDxEntry(BaseModel):
    """Represents a single differential diagnosis clinical candidate."""
    diagnosis: str = Field(..., description="Name of the clinical condition or pathology")
    confidence: float = Field(..., description="Model confidence probability (0.0 to 1.0)")
    reasoning: str = Field(..., description="Detailed medical reasoning supporting this candidate")

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, value: float) -> float:
        if value < 0.0 or value > 1.0:
            raise ValueError("Confidence probability score must be between 0.0 and 1.0.")
        return value


class DrugInteraction(BaseModel):
    """Represents a pharmaceutical conflict or allergy alert."""
    drug_a: str = Field(..., description="First pharmaceutical substance name")
    drug_b: str = Field(..., description="Second pharmaceutical substance name, or allergy trigger")
    severity: str = Field(..., description="Triage severity level (low, moderate, high, critical)")
    description: str = Field(..., description="Detailed clinical description of interaction dangers")


class ClinicalReportResponse(BaseModel):
    """API response body returning full generated clinical report details."""
    id: UUID = Field(..., description="Unique report ID")
    session_id: UUID = Field(..., description="Associated patient session ID")
    created_at: datetime = Field(..., description="Generation timestamp")
    differential_diagnosis: List[DDxEntry] = Field(default_factory=list, description="Prioritized DDx results")
    recommended_tests: List[str] = Field(default_factory=list, description="List of recommended lab tests")
    drug_interactions_found: List[DrugInteraction] = Field(default_factory=list, description="Found drug-drug or drug-allergy interactions")
    clinical_summary: str = Field(..., description="Integrated physician synthesis narrative")
    urgency_level: str = Field(..., description=" Triage classification (low, medium, high, critical)")
    report_pdf_url: Optional[str] = Field(default=None, description="Storage path containing secure report PDF download link")
    fhir_bundle: Optional[Dict[str, Any]] = Field(default=None, description="FHIR specification representation payload")
    reviewed_by_agent: str = Field(..., description="Signature log of the reviewing report specialist agent")
