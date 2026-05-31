from datetime import datetime
from uuid import UUID
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator


class PatientInput(BaseModel):
    """API request payload schema representing raw patient data inputs for intake."""
    patient_name: str = Field(..., description="Encrypted or anonymized full name of the patient")
    patient_age: int = Field(..., description="Age of the patient in years (0-120)")
    patient_gender: str = Field(..., description="Biological sex / gender representation (male, female, other)")
    chief_complaint: str = Field(..., description="Primary reason for visit in patient's raw words")
    symptoms: List[str] = Field(..., description="List of recognized symptom tokens")
    medical_history: List[str] = Field(default_factory=list, description="Historical clinical conditions/diagnoses")
    current_medications: List[str] = Field(default_factory=list, description="List of active patient medications")
    allergies: List[str] = Field(default_factory=list, description="Known patient drug allergies")
    vitals: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Patient vitals mapping (bp, heart_rate, temperature, spo2, weight, height)"
    )

    @field_validator("patient_age")
    @classmethod
    def validate_patient_age(cls, value: int) -> int:
        if value < 0 or value > 120:
            raise ValueError("Age must be between 0 and 120 years.")
        return value

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms(cls, value: List[str]) -> List[str]:
        if not value:
            raise ValueError("Symptoms list must not be empty. Provide at least one symptom.")
        return value


class PatientSessionResponse(BaseModel):
    """API response body indicating successful patient session creation."""
    session_id: UUID = Field(..., description="Unique generated UUID for tracking this session")
    status: str = Field(..., description="Active session status state")
    created_at: datetime = Field(..., description="Timestamp representing database record creation")
    message: str = Field(..., description="Readable status response description text")
