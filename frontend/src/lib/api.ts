import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import {
  PatientInput,
  PatientSessionResponse,
  PatientSession,
  ClinicalReportResponse,
  AuditLogEntry,
  PaginatedResponse,
  ApiError,
  AnalyticsOverview,
  AnalyticsDailyTrend,
  AnalyticsAgentPerformance,
  AnalyticsDiagnosisFrequency,
  AnalyticsDrugInteractions,
  AnalyticsDemographics,
  AnalyticsAnomaly,
  AnalyticsDashboardResponse
} from '@/types';

// In Vercel production, use relative URL so requests go through vercel.json rewrites → Railway proxy
// In local dev, use NEXT_PUBLIC_API_URL directly (localhost:8000)
const isServer = typeof window === 'undefined';
const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';

let apiBaseURL: string;
if (isProduction && !isServer) {
  // Use relative URL in browser — Vercel rewrites /api/* → Railway backend
  apiBaseURL = '';
} else {
  // Dev/SSR: use the full URL from environment
  let rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  if (rawApiUrl && !rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
    rawApiUrl = `https://${rawApiUrl}`;
  }
  apiBaseURL = rawApiUrl;
}

// Establish Axios instance with environment variables and defaults
const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject Bearer Token or API Key & Logger in dev environment
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let hasAuth = false;
    
    // Inject JWT token if available in localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('mediguard_clinical_token');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
        hasAuth = true;
      }
    }
    
    // Fallback to API key for backward-compatibility if Bearer token not injected
    if (!hasAuth && config.headers) {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'mediguard_v2_secret_api_key_override';
      if (apiKey) {
        config.headers['X-API-Key'] = apiKey;
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} -> ${config.url}`, config.data || '');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Structured handling of HTTP Status Codes & MediGuard error standards
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.status} <- ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    
    // Parse error structure into structured ApiError interface
    const apiError: ApiError = {
      error: true,
      error_code: (responseData?.error_code as string) || 'NETWORK_ERROR',
      message: (responseData?.message as string) || error.message || 'An unexpected connection error occurred.',
      details: (responseData?.details as Record<string, unknown>) || {},
      timestamp: (responseData?.timestamp as string) || new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', apiError);
    }

    // 401 Unauthorized -> Redirect to /login securely
    if (status === 401) {
      if (typeof window !== 'undefined') {
        toast.error('Unauthorized access. Redirecting to login...');
        window.location.href = '/login';
      }
    } 
    // 5xx Internal Server Error -> display dynamic Sonner Toast
    else if (status && status >= 500) {
      toast.error(`Clinical Engine Error: ${apiError.message}`);
    } 
    // 400/404/422 Standard Client Failures -> show warnings
    else if (status && status >= 400 && status < 500) {
      toast.warning(`Validation Alert: ${apiError.message}`);
    }

    return Promise.reject(apiError);
  }
);

// ==========================================
// CLINICAL SESSIONS API CALLS
// ==========================================

export async function createSession(data: PatientInput): Promise<PatientSessionResponse> {
  const backendPayload = {
    patient_name: data.patient_name,
    patient_age: data.age,
    patient_gender: data.gender,
    chief_complaint: data.chief_complaint,
    symptoms: data.symptoms,
    medical_history: data.medical_history,
    current_medications: data.current_medications,
    allergies: data.allergies,
    vitals: data.vitals,
  };
  const res = await api.post<PatientSessionResponse>('/api/v1/patient/session', backendPayload);
  return res.data;
}

export async function getSession(sessionId: string): Promise<PatientSession> {
  const res = await api.get<PatientSession>(`/api/v1/patient/session/${sessionId}`);
  return res.data;
}

export async function listSessions(limit = 20, offset = 0): Promise<PaginatedResponse<PatientSession>> {
  const res = await api.get<any>(`/api/v1/patient/sessions?limit=${limit}&offset=${offset}`);
  return {
    data: res.data.results || [],
    count: res.data.count || 0,
    limit: res.data.limit || limit,
    offset: res.data.offset || offset,
  };
}

// ==========================================
// CLINICAL DECISION SUPPORT REPORTS API CALLS
// ==========================================

export async function generateReport(sessionId: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/v1/report/generate', { session_id: sessionId });
  return res.data;
}

export async function getReport(sessionId: string): Promise<ClinicalReportResponse> {
  const res = await api.get<ClinicalReportResponse>(`/api/v1/report/${sessionId}`);
  return res.data;
}

export async function getAuditTrail(sessionId: string): Promise<AuditLogEntry[]> {
  const res = await api.get<AuditLogEntry[]>(`/api/v1/report/${sessionId}/audit`);
  return res.data;
}

export function getPdfUrl(sessionId: string): string {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('mediguard_clinical_token') || '';
  }
  // Use relative URL in production (Vercel proxy handles routing), direct URL in dev
  const baseURL = (isProduction && !isServer) ? '' : (process.env.NEXT_PUBLIC_API_URL || '');
  return `${baseURL}/api/v1/report/${sessionId}/pdf?token=${encodeURIComponent(token)}`;
}

export async function getFhirBundle(sessionId: string): Promise<object> {
  const res = await api.get<object>(`/api/v1/report/${sessionId}/fhir`);
  return res.data;
}

// ==========================================
// SYSTEM DIAGNOSTICS & HEALTH CHECK
// ==========================================

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await api.get<{ status: string; timestamp: string }>('/api/v1/health');
  return res.data;
}

// ==========================================
// CLINICAL AUTHENTICATION API CALLS
// ==========================================

export interface LoginPayload {
  email: string;
  key_phrase: string;
  institution_code: string;
}

export interface LoginResponseData {
  access_token: string;
  token_type: string;
  expires_in: number;
  staff_id: string;
  full_name: string;
  role: string;
  institution_name: string;
  institution_code: string;
}

export interface StaffProfileData {
  id: string;
  email: string;
  full_name: string;
  role: 'physician' | 'nurse' | 'pharmacist' | 'admin' | 'superadmin';
  specialization: string | null;
  institution_name: string;
  institution_code: string;
  last_login_at: string | null;
  login_count: number;
  is_active: boolean;
  employee_id: string | null;
}

export async function loginClinicalStaff(payload: LoginPayload): Promise<LoginResponseData> {
  const res = await api.post<LoginResponseData>('/api/v1/auth/login', payload);
  return res.data;
}

export async function getClinicalStaffProfile(): Promise<StaffProfileData> {
  const res = await api.get<StaffProfileData>('/api/v1/auth/me');
  return res.data;
}

export async function logoutClinicalStaff(): Promise<void> {
  await api.post('/api/v1/auth/logout');
}

export interface CreateStaffPayload {
  email: string;
  full_name: string;
  role: string;
  key_phrase: string;
  specialization?: string | null;
  employee_id?: string | null;
  institution_code: string;
}

export async function createClinicalStaff(payload: CreateStaffPayload): Promise<StaffProfileData> {
  const res = await api.post<StaffProfileData>('/api/v1/auth/admin/staff', payload);
  return res.data;
}

export async function listClinicalStaff(): Promise<StaffProfileData[]> {
  const res = await api.get<StaffProfileData[]>('/api/v1/auth/admin/staff');
  return res.data;
}

export async function deactivateClinicalStaff(staffId: string): Promise<void> {
  await api.delete(`/api/v1/auth/admin/staff/${staffId}`);
}

export async function reactivateClinicalStaff(staffId: string): Promise<void> {
  await api.post(`/api/v1/auth/admin/staff/${staffId}/reactivate`);
}

export interface AuditLogItem {
  id: string;
  created_at: string;
  staff_id: string | null;
  institution_id: string;
  institution_code: string;
  email: string;
  action: string;
  ip_address: string;
  user_agent: string;
  failure_reason: string | null;
  metadata: any;
}

export async function getAdminAuditLogs(limit = 100, offset = 0): Promise<AuditLogItem[]> {
  const res = await api.get<AuditLogItem[]>(`/api/v1/auth/admin/audit-log?limit=${limit}&offset=${offset}`);
  return res.data;
}

export interface CreateInstitutionPayload {
  institution_code: string;
  institution_name: string;
  institution_type: string;
  city: string;
  state: string;
  max_staff_accounts?: number;
  first_admin_email: string;
  first_admin_name: string;
  first_admin_key_phrase: string;
}

export async function createInstitution(payload: CreateInstitutionPayload): Promise<any> {
  const res = await api.post<any>('/api/v1/superadmin/institution', payload);
  return res.data;
}

// ==========================================
// EHR INTEROPERABILITY API CALLS
// ==========================================

export interface EhrPatientRecord {
  id: string;
  patient_name: string;
  age: number;
  gender: string;
  chief_complaint: string;
  symptoms: string[];
  medical_history: string[];
  allergies: string[];
  current_medications: string[];
  vitals: {
    bp?: string;
    heart_rate?: number;
    temperature?: number;
    spo2?: number;
    weight?: number;
    height?: number;
  };
}

export interface EhrSyncResponse {
  success: boolean;
  session_id: string;
  synced_at: string;
  ehr_record_id: string;
  message: string;
}

export async function fetchEhrPatient(patientId: string): Promise<EhrPatientRecord> {
  const res = await api.get<EhrPatientRecord>(`/api/v1/ehr/patient/${patientId}`);
  return res.data;
}

export async function syncToEhr(sessionId: string): Promise<EhrSyncResponse> {
  const res = await api.post<EhrSyncResponse>(`/api/v1/ehr/sync/${sessionId}`);
  return res.data;
}

// ==========================================
// CLINICAL ANALYTICS API CALLS
// ==========================================

export async function getAnalyticsDashboard(days = 30): Promise<AnalyticsDashboardResponse> {
  const res = await api.get<AnalyticsDashboardResponse>(`/api/v1/analytics/dashboard?days=${days}`);
  return res.data;
}

export async function getAnalyticsOverview(days = 30): Promise<AnalyticsOverview> {
  const res = await api.get<AnalyticsOverview>(`/api/v1/analytics/overview?days=${days}`);
  return res.data;
}

export async function getAnalyticsTrend(days = 30): Promise<AnalyticsDailyTrend[]> {
  const res = await api.get<AnalyticsDailyTrend[]>(`/api/v1/analytics/trend?days=${days}`);
  return res.data;
}

export async function getAnalyticsAgents(): Promise<AnalyticsAgentPerformance[]> {
  const res = await api.get<AnalyticsAgentPerformance[]>('/api/v1/analytics/agents');
  return res.data;
}

export async function getAnalyticsDiagnoses(limit = 10): Promise<AnalyticsDiagnosisFrequency[]> {
  const res = await api.get<AnalyticsDiagnosisFrequency[]>(`/api/v1/analytics/diagnoses?limit=${limit}`);
  return res.data;
}

export async function getAnalyticsDrugs(): Promise<AnalyticsDrugInteractions> {
  const res = await api.get<AnalyticsDrugInteractions>('/api/v1/analytics/drugs');
  return res.data;
}

export async function getAnalyticsDemographics(): Promise<AnalyticsDemographics> {
  const res = await api.get<AnalyticsDemographics>('/api/v1/analytics/demographics');
  return res.data;
}

export async function getAnalyticsAnomalies(): Promise<AnalyticsAnomaly[]> {
  const res = await api.get<AnalyticsAnomaly[]>('/api/v1/analytics/anomalies');
  return res.data;
}

// ── Day 6 — Voice Intake & Smart Symptom Intelligence ─────────────────────────

export interface VoiceParseResult {
  parsed_data: Record<string, unknown>;
  extraction_confidence: number;
  fields_extracted: string[];
  fields_missing: string[];
  parser_notes: string;
  red_flags_detected: boolean;
  processing_time_ms: number;
}

export async function parseVoiceTranscript(
  transcript: string,
  existingData?: Record<string, unknown>
): Promise<VoiceParseResult> {
  const payload: Record<string, unknown> = { transcript };
  if (existingData) {
    payload.session_context = { existing_data: existingData };
  }
  const res = await api.post<VoiceParseResult>('/api/v1/voice/parse', payload);
  return res.data;
}

export interface SymptomSuggestions {
  autocomplete: Array<{ symptom: string; display: string; match_type: string }>;
  related_suggestions: Array<{ symptom: string; reason: string; score: number; urgency: string }>;
  clinical_questions: string[];
  current_urgency_hint: string;
  red_flags_detected: Array<{ combination: string[]; warning: string }>;
}

export async function getSymptomSuggestions(
  symptoms: string[],
  q?: string,
  limit = 8
): Promise<SymptomSuggestions> {
  const params = new URLSearchParams();
  if (symptoms.length) params.set('symptoms', symptoms.join(','));
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  const res = await api.get<SymptomSuggestions>(`/api/v1/symptoms/suggest?${params}`);
  return res.data;
}

// ── Day 7 — Safety Evaluation Pipeline ─────────────────────────────────────────

export interface EvalReportRecord {
  id: string;
  created_at: string;
  evaluation_id: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate: number;
  recommendation: string;
  run_mode: 'mock' | 'live';
  results_json: Record<string, any>;
  summary_report: string;
  triggered_by?: string;
  institution_id: string;
}

export async function getSafetyReports(): Promise<EvalReportRecord[]> {
  const res = await api.get<EvalReportRecord[]>('/api/v1/admin/safety-report');
  return res.data;
}

export async function runSafetyEvaluation(mode: 'mock' | 'live' = 'mock'): Promise<{
  status: string;
  message: string;
  report: EvalReportRecord;
}> {
  const res = await api.post<{
    status: string;
    message: string;
    report: EvalReportRecord;
  }>(`/api/v1/admin/run-eval?mode=${mode}`);
  return res.data;
}

export default api;

