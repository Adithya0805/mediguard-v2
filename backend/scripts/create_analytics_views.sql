-- ==========================================
-- MEDIGUARD V2 CLINICAL ANALYTICS VIEWS
-- ==========================================

-- VIEW 1: session_analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT
  ps.id as session_id,
  ps.institution_id,
  ps.created_at,
  ps.status,
  ps.patient_age,
  ps.patient_gender,
  cr.urgency_level,
  cr.primary_diagnosis,
  cr.differential_diagnosis,
  cr.drug_interactions_found,
  cr.recommended_tests,
  EXTRACT(EPOCH FROM (
    cr.created_at - ps.created_at
  )) as pipeline_duration_seconds,
  (SELECT COUNT(*) FROM agent_runs ar
   WHERE ar.session_id = ps.id
   AND ar.status = 'success')
   as successful_agents,
  (SELECT COUNT(*) FROM agent_runs ar
   WHERE ar.session_id = ps.id
   AND ar.status = 'failed')
   as failed_agents,
  (SELECT SUM(ar.tokens_used)
   FROM agent_runs ar
   WHERE ar.session_id = ps.id)
   as total_tokens_used
FROM patient_sessions ps
LEFT JOIN clinical_reports cr
  ON cr.session_id = ps.id
WHERE ps.status = 'completed';

-- VIEW 2: daily_session_counts
CREATE OR REPLACE VIEW daily_session_counts AS
SELECT
  institution_id,
  DATE(created_at) as date,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (
    WHERE urgency_level = 'critical'
  ) as critical_count,
  COUNT(*) FILTER (
    WHERE urgency_level = 'high'
  ) as high_count,
  COUNT(*) FILTER (
    WHERE urgency_level = 'medium'
  ) as medium_count,
  COUNT(*) FILTER (
    WHERE urgency_level = 'low'
  ) as low_count,
  AVG(pipeline_duration_seconds)
    as avg_pipeline_seconds
FROM session_analytics
GROUP BY institution_id, DATE(created_at)
ORDER BY date DESC;

-- VIEW 3: agent_performance_stats
-- Modified to join patient_sessions to resolve institution_id
CREATE OR REPLACE VIEW agent_performance_stats AS
SELECT
  ar.agent_name,
  ps.institution_id,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE ar.status = 'success')
    as success_count,
  COUNT(*) FILTER (WHERE ar.status = 'failed')
    as failure_count,
  ROUND(
    COUNT(*) FILTER (WHERE ar.status = 'success')
    * 100.0 / COUNT(*), 2
  ) as success_rate_percent,
  AVG(EXTRACT(EPOCH FROM (
    ar.completed_at - ar.started_at
  ))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (
    ar.completed_at - ar.started_at
  ))) as max_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (
    ar.completed_at - ar.started_at
  ))) as min_duration_seconds,
  AVG(ar.tokens_used) as avg_tokens_used
FROM agent_runs ar
JOIN patient_sessions ps
  ON ps.id = ar.session_id
WHERE ar.completed_at IS NOT NULL
GROUP BY ar.agent_name, ps.institution_id;

-- VIEW 4: diagnosis_frequency
CREATE OR REPLACE VIEW diagnosis_frequency AS
SELECT
  institution_id,
  cr.primary_diagnosis->>'diagnosis'
    as diagnosis_name,
  cr.primary_diagnosis->>'icd10_code'
    as icd10_code,
  COUNT(*) as frequency,
  AVG((cr.primary_diagnosis->>'confidence')
    ::float) as avg_confidence,
  COUNT(*) FILTER (
    WHERE cr.urgency_level IN ('high','critical')
  ) as high_urgency_count
FROM clinical_reports cr
JOIN patient_sessions ps
  ON ps.id = cr.session_id
WHERE cr.primary_diagnosis IS NOT NULL
GROUP BY
  institution_id,
  cr.primary_diagnosis->>'diagnosis',
  cr.primary_diagnosis->>'icd10_code'
ORDER BY frequency DESC;

-- VIEW 5: drug_interaction_frequency
CREATE OR REPLACE VIEW drug_interaction_frequency AS
SELECT
  institution_id,
  interaction->>'drug_a' as drug_a,
  interaction->>'drug_b' as drug_b,
  interaction->>'severity' as severity,
  COUNT(*) as frequency
FROM clinical_reports cr
JOIN patient_sessions ps
  ON ps.id = cr.session_id,
jsonb_array_elements(
  cr.drug_interactions_found
) as interaction
GROUP BY
  institution_id,
  interaction->>'drug_a',
  interaction->>'drug_b',
  interaction->>'severity'
ORDER BY frequency DESC;

-- Optimizing Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_patient_sessions_institution_created
  ON patient_sessions(institution_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_clinical_reports_urgency
  ON clinical_reports(urgency_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_agent_runs_name_status
  ON agent_runs(agent_name, status);
