from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class PatientSession(BaseModel):
    """Pydantic representation of the patient_sessions table in Supabase."""
    id: UUID = Field(default_factory=uuid4, description="Primary Key, unique session ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session ingestion timestamp")
    patient_name: str = Field(..., description="Encrypted or anonymized full name of the patient")
    patient_age: int = Field(..., ge=0, le=120, description="Age of the patient in years")
    patient_gender: str = Field(..., description="Biological sex / gender representation (male, female, other)")
    chief_complaint: str = Field(..., description="Primary reason for visit in patient's raw words")
    symptoms: List[str] = Field(default_factory=list, description="List of recognized symptom tokens")
    medical_history: List[str] = Field(default_factory=list, description="Historical clinical conditions/diagnoses")
    current_medications: List[str] = Field(default_factory=list, description="List of active patient medications")
    allergies: List[str] = Field(default_factory=list, description="Known patient drug allergies")
    vitals: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Patient vitals mapping (bp, heart_rate, temperature, spo2, weight, height)"
    )
    status: str = Field(default="pending", description="Orchestration workflow status (pending, processing, completed, failed)")
    institution_id: Optional[UUID] = Field(default=None, description="Optional tenant institution mapping")


class AgentRun(BaseModel):
    """Pydantic representation of the agent_runs execution log table."""
    id: UUID = Field(default_factory=uuid4, description="Unique execution ID")
    session_id: UUID = Field(..., description="Foreign key mapping to the PatientSession")
    agent_name: str = Field(..., description="Name of the specialist agent (e.g. Intake, Symptom, Drug)")
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Agent execution start timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Agent execution completion timestamp")
    status: str = Field(default="running", description="Status of the run (running, success, failed)")
    input_summary: str = Field(..., description="Brief summary of inputs given to this agent")
    output_summary: Optional[str] = Field(default=None, description="Summary of final output generated")
    error_message: Optional[str] = Field(default=None, description="Intercepted exception messages if execution failed")
    tokens_used: Optional[int] = Field(default=0, description="Total API tokens utilized by this run")


class ClinicalReport(BaseModel):
    """Pydantic representation of the clinical_reports final output table."""
    id: UUID = Field(default_factory=uuid4, description="Unique report ID")
    session_id: UUID = Field(..., description="Foreign key mapping to the PatientSession")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when report was generated")
    differential_diagnosis: List[Dict[str, Any]] = Field(
        default_factory=list, 
        description="Prioritized list of differential diagnoses (DDx) with associated confidence scores and reasons"
    )
    recommended_tests: List[str] = Field(default_factory=list, description="Suggested diagnostic labs or imaging protocols")
    drug_interactions_found: List[Dict[str, Any]] = Field(
        default_factory=list, 
        description="Identified pharmaceutical cross-interactions or patient allergy flags"
    )
    clinical_summary: str = Field(..., description="Integrated physician-facing synthesis of case details")
    urgency_level: str = Field(..., description="Clinical triage level (low, medium, high, critical)")
    report_pdf_url: Optional[str] = Field(default=None, description="Secure URL path to the generated clinical PDF report")
    fhir_bundle: Optional[Dict[str, Any]] = Field(default=None, description="Standardized HL7/FHIR compliant representation")
    reviewed_by_agent: str = Field(..., description="Agent signature who compiled/reviewed the report")


class AuditLog(BaseModel):
    """Pydantic representation of the audit_logs tracking table."""
    id: UUID = Field(default_factory=uuid4, description="Unique audit event entry ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Audit log timestamp")
    session_id: Optional[UUID] = Field(default=None, description="Associated patient session ID if applicable")
    action: str = Field(..., description="Action type performed (e.g. session_created, agent_started, report_generated)")
    actor: str = Field(..., description="Identifier of systemic entity executing the action (system / agent name)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Detailed tracking context payload")


class Institution(BaseModel):
    """Pydantic representation of the institutions multi-tenant table."""
    id: UUID = Field(default_factory=uuid4, description="Primary Key, unique institution ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Registration timestamp")
    institution_code: str = Field(..., description="Unique human-readable institution identifier")
    institution_name: str = Field(..., description="Full legal name of the institution")
    institution_type: str = Field(default="hospital", description="Type: hospital, clinic, lab, etc.")
    city: Optional[str] = Field(default=None, description="City of institution location")
    state: Optional[str] = Field(default=None, description="State/Province of institution location")
    is_active: bool = Field(default=True, description="Whether institution access is currently active")
    max_staff_accounts: int = Field(default=50, description="Maximum allowed staff accounts for this institution")


class ClinicalStaff(BaseModel):
    """Pydantic representation of the clinical_staff authentication table."""
    id: UUID = Field(default_factory=uuid4, description="Primary Key, unique staff member ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation timestamp")
    email: str = Field(..., description="Unique institutional email address")
    full_name: str = Field(..., description="Full legal name of the clinical staff member")
    role: str = Field(..., description="Clinical role: physician, nurse, pharmacist, admin, superadmin")
    specialization: Optional[str] = Field(default=None, description="Medical specialization area")
    institution_id: UUID = Field(..., description="Foreign key to institutions table")
    institution_code: str = Field(..., description="Denormalized institution code for fast lookups")
    hashed_key_phrase: str = Field(..., description="bcrypt-hashed authentication key phrase")
    is_active: bool = Field(default=True, description="Whether this account is currently active")
    last_login_at: Optional[datetime] = Field(default=None, description="Timestamp of most recent login")
    login_count: int = Field(default=0, description="Total number of successful logins")
    employee_id: Optional[str] = Field(default=None, description="Internal hospital employee ID")
