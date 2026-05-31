export type SessionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface VitalsData {
  bp?: string;
  heart_rate?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  weight?: number | null;
  height?: number | null;
}

export interface PatientInput {
  patient_name: string;
  age: number;
  gender: string;
  chief_complaint: string;
  symptoms: string[];
  medical_history: string[];
  current_medications: string[];
  allergies: string[];
  vitals: VitalsData;
}

export interface PatientSessionResponse {
  session_id: string;
  status: SessionStatus;
  message: string;
}

export interface PatientSession {
  id: string;
  created_at: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  chief_complaint: string;
  symptoms: string[];
  medical_history: string[];
  current_medications: string[];
  allergies: string[];
  vitals: VitalsData;
  status: SessionStatus;
}

export interface DDxEntry {
  rank: number;
  diagnosis: string;
  icd10_code: string;
  confidence: number;
  urgency: UrgencyLevel;
  clinical_reasoning: string;
}

export interface DrugInteraction {
  drug_a: string;
  drug_b: string;
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  management: string;
}

export interface ClinicalReport {
  id: string;
  session_id: string;
  created_at: string;
  differential_diagnosis: DDxEntry[];
  recommended_tests: string[];
  drug_interactions_found: DrugInteraction[];
  clinical_summary: string;
  urgency_level: UrgencyLevel;
  report_pdf_url: string | null;
  fhir_bundle: Record<string, unknown> | null;
  reviewed_by_agent: string;
}

export interface ClinicalReportResponse {
  id: string;
  session_id: string;
  created_at: string;
  differential_diagnosis: DDxEntry[];
  recommended_tests: string[];
  drug_interactions_found: DrugInteraction[];
  clinical_summary: string;
  urgency_level: UrgencyLevel;
  report_pdf_url: string | null;
  fhir_bundle: Record<string, unknown> | null;
  reviewed_by_agent: string;
}

export interface AgentRun {
  id: string;
  session_id: string;
  agent_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  outputs?: Record<string, unknown>;
  errors?: string;
}

export interface AuditLogEntry {
  id: string;
  session_id?: string;
  action: string;
  actor: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface ApiError {
  error: boolean;
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
}

export interface DocumentGenerationResult {
  pdf_url: string;
  pdf_size_bytes: number;
  fhir_valid: boolean;
  fhir_issues: string[];
  generated_at: string;
}
