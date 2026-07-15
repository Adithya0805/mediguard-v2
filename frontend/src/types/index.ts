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
  mechanism?: string;
  clinical_effect?: string;
  fda_cited?: boolean;
  fda_source?: string;
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

// ==========================================
// CLINICAL ANALYTICS TYPES
// ==========================================

export interface AnalyticsOverview {
  total_sessions: number;
  completed_sessions: number;
  avg_pipeline_seconds: number;
  fastest_pipeline_seconds: number;
  total_tokens_used: number;
  urgency_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  completion_rate_percent: number;
  sessions_today: number;
  sessions_this_week: number;
  sessions_last_week: number;
  week_over_week_change_percent: number;
}

export interface AnalyticsDailyTrend {
  date: string;
  raw_date: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avg_pipeline_seconds: number;
}

export interface AnalyticsAgentPerformance {
  agent_name: string;
  display_name: string;
  total_runs: number;
  success_rate: number;
  avg_seconds: number;
  max_seconds: number;
  avg_tokens: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface AnalyticsDiagnosisFrequency {
  diagnosis: string;
  icd10_code: string;
  count: number;
  avg_confidence: number;
  high_urgency_percent: number;
}

export interface AnalyticsDrugInteractions {
  total_interactions_detected: number;
  most_common_pairs: Array<{
    drug_a: string;
    drug_b: string;
    severity: string;
    count: number;
  }>;
  by_severity: {
    contraindicated: number;
    severe: number;
    moderate: number;
    mild: number;
  };
}

export interface AnalyticsDemographics {
  age_groups: {
    '0-18': number;
    '19-35': number;
    '36-50': number;
    '51-65': number;
    '65+': number;
  };
  gender_split: {
    male: number;
    female: number;
    other: number;
  };
  avg_age: number;
}

export interface AnalyticsAnomaly {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  detected_at: string;
}

export interface AnalyticsDashboardResponse {
  institution_id: string;
  generated_at: string;
  overview: AnalyticsOverview;
  daily_trend: AnalyticsDailyTrend[];
  agent_performance: AnalyticsAgentPerformance[];
  top_diagnoses: AnalyticsDiagnosisFrequency[];
  drug_interactions: AnalyticsDrugInteractions;
  patient_demographics: AnalyticsDemographics;
  anomalies: AnalyticsAnomaly[];
}

