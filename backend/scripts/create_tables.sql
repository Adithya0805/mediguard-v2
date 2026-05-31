-- =============================================================================
-- MEDIGUARD V2 - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- =============================================================================

-- Enable extension for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABLE: patient_sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    patient_name VARCHAR(255) NOT NULL,
    patient_age INT NOT NULL CHECK (patient_age >= 0 AND patient_age <= 120),
    patient_gender VARCHAR(50) NOT NULL,
    chief_complaint TEXT NOT NULL,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    medical_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_medications JSONB NOT NULL DEFAULT '[]'::jsonb,
    allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
    vitals JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
);

-- =============================================================================
-- 2. TABLE: agent_runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES patient_sessions(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    input_summary TEXT NOT NULL,
    output_summary TEXT,
    error_message TEXT,
    tokens_used INT DEFAULT 0
);

-- =============================================================================
-- 3. TABLE: clinical_reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS clinical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES patient_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    differential_diagnosis JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
    drug_interactions_found JSONB NOT NULL DEFAULT '[]'::jsonb,
    clinical_summary TEXT NOT NULL,
    urgency_level VARCHAR(50) NOT NULL,
    report_pdf_url TEXT,
    fhir_bundle JSONB DEFAULT '{}'::jsonb,
    reviewed_by_agent VARCHAR(100) NOT NULL
);

-- =============================================================================
-- 4. TABLE: audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- =============================================================================
-- INDEX CREATION FOR PERFORMANCE OPTIMIZATION
-- =============================================================================
-- Query session details by ID / FK lookups quickly
CREATE INDEX IF NOT EXISTS idx_agent_runs_session_id ON agent_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_clinical_reports_session_id ON clinical_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

-- Filter or order by workflow state and creation dates
CREATE INDEX IF NOT EXISTS idx_patient_sessions_status ON patient_sessions(status);
CREATE INDEX IF NOT EXISTS idx_patient_sessions_created_at ON patient_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_clinical_reports_created_at ON clinical_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- AUTOMATIC TIMESTAMPTZ TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patient_sessions_updated_at
    BEFORE UPDATE ON patient_sessions
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
