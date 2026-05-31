import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import {
  PatientInput,
  PatientSessionResponse,
  PatientSession,
  ClinicalReportResponse,
  AuditLogEntry,
  PaginatedResponse,
  ApiError
} from '@/types';

// Detect environment to configure the backend connection path
const isProd = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';
const baseURL = isProd ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

// Establish Axios instance with environment variables and defaults
const api = axios.create({
  baseURL: baseURL,
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
      const token = localStorage.getItem('medi_token');
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
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'mediguard_v2_secret_api_key_override';
  return `${baseURL}/api/v1/report/${sessionId}/pdf?api_key=${encodeURIComponent(apiKey)}`;
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

export interface ClinicianProfile {
  username: string;
  name: string;
  role: string;
  specialty: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  name: string;
  role: string;
}

export async function loginClinician(username: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/api/v1/auth/login', { username, password });
  return res.data;
}

export async function getClinicianProfile(): Promise<ClinicianProfile> {
  const res = await api.get<ClinicianProfile>('/api/v1/auth/me');
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

export default api;
