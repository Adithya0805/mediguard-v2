-- =====================================================================
-- MEDIGUARD V2 - CLINICAL AUTHENTICATION AND MULTI-TENANCY SCHEMA
-- =====================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    institution_code TEXT UNIQUE NOT NULL,
    institution_name TEXT NOT NULL,
    institution_type TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_staff_accounts INTEGER DEFAULT 50,
    created_by TEXT DEFAULT 'superadmin'
);

-- 2. CLINICAL STAFF TABLE
CREATE TABLE IF NOT EXISTS clinical_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    institution_code TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_key_phrase TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('physician', 'nurse', 'pharmacist', 'admin', 'superadmin')),
    specialization TEXT,
    employee_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES clinical_staff(id) ON DELETE SET NULL,
    deactivated_at TIMESTAMPTZ,
    deactivated_by UUID REFERENCES clinical_staff(id) ON DELETE SET NULL
);

-- 3. AUTH SESSIONS TABLE
CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    staff_id UUID REFERENCES clinical_staff(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. AUTH AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    staff_id UUID,
    institution_id UUID,
    institution_code TEXT,
    email TEXT,
    action TEXT NOT NULL CHECK (action IN (
        'login_success', 'login_failed',
        'login_invalid_institution',
        'login_account_inactive',
        'logout', 'token_expired',
        'password_changed', 'account_created',
        'account_deactivated', 'account_reactivated'
    )),
    ip_address TEXT,
    user_agent TEXT,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Alter existing patient_sessions table to support institutional multi-tenancy
ALTER TABLE patient_sessions ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL;

-- 5. INDEXES FOR PERFORMANCE AND AUDITING
CREATE INDEX IF NOT EXISTS idx_clinical_staff_email ON clinical_staff(email);
CREATE INDEX IF NOT EXISTS idx_clinical_staff_inst_code ON clinical_staff(institution_code);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_staff ON auth_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_staff ON auth_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created ON auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action ON auth_audit_log(action);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- 6a. institutions Policies
CREATE POLICY select_institutions ON institutions
    FOR SELECT USING (is_active = TRUE);

-- 6b. clinical_staff Policies
-- Staff can SELECT their own profile
CREATE POLICY select_own_profile ON clinical_staff
    FOR SELECT USING (id = auth.uid());

-- Admins can SELECT all staff within their own institution
CREATE POLICY select_institution_staff ON clinical_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clinical_staff AS admin_user
            WHERE admin_user.id = auth.uid()
              AND admin_user.role = 'admin'
              AND admin_user.institution_id = clinical_staff.institution_id
        )
    );

-- 6c. auth_sessions Policies
CREATE POLICY select_own_sessions ON auth_sessions
    FOR SELECT USING (staff_id = auth.uid());

-- 6d. auth_audit_log Policies (Admins can SELECT their institution's logs; no UPDATE or DELETE ever)
CREATE POLICY select_institution_audit ON auth_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clinical_staff AS admin_user
            WHERE admin_user.id = auth.uid()
              AND admin_user.role = 'admin'
              AND admin_user.institution_id = auth_audit_log.institution_id
        )
    );


-- 8. EVALUATION REPORTS TABLE
CREATE TABLE IF NOT EXISTS eval_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    evaluation_id TEXT UNIQUE NOT NULL,
    total_cases INTEGER NOT NULL,
    passed_cases INTEGER NOT NULL,
    failed_cases INTEGER NOT NULL,
    pass_rate NUMERIC NOT NULL,
    recommendation TEXT NOT NULL,
    run_mode TEXT NOT NULL CHECK (run_mode IN ('mock', 'live')),
    results_json JSONB DEFAULT '{}',
    summary_report TEXT,
    triggered_by UUID REFERENCES clinical_staff(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE
);

-- Enable RLS for eval_reports
ALTER TABLE eval_reports ENABLE ROW LEVEL SECURITY;

-- Admins and staff can view safety reports for their institution
CREATE POLICY select_institution_evals ON eval_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clinical_staff AS cs
            WHERE cs.id = auth.uid()
              AND cs.institution_id = eval_reports.institution_id
        )
    );

-- Admins and trigger systems can insert eval reports
CREATE POLICY insert_institution_evals ON eval_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM clinical_staff AS cs
            WHERE cs.id = auth.uid()
              AND cs.institution_id = eval_reports.institution_id
        )
    );

-- 7. SEED DATA - INITIAL DEMO INSTITUTION
INSERT INTO institutions (institution_code, institution_name, institution_type, city, state, max_staff_accounts)
VALUES ('MEDIGUARD-DEMO-001', 'MediGuard Demo Hospital', 'hospital', 'Chennai', 'Tamil Nadu', 50)
ON CONFLICT (institution_code) DO NOTHING;

