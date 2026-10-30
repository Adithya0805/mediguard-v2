/**
 * MediGuard V2 — Architecture Simulator Data
 * 
 * Source-verified simulation datasets for both Standard and Critical Urgency routes.
 * 
 * Sources:
 * - backend/app/agents/orchestrator.py (LangGraph supervisor topology, parallel_clinical_analysis, _conditional_route_after_symptom)
 * - backend/app/schemas/websocket.py (AgentEventType, AgentEvent)
 * - backend/app/schemas/agent.py (AgentState, build_initial_state)
 * - backend/app/agents/intake_agent.py, symptom_agent.py, diagnosis_agent.py, drug_agent.py, report_agent.py
 * 
 * NOTE: All timestamps and durations are explicitly simulated illustrative examples
 * for educational architectural exploration. No real clinical endpoints or LLMs are invoked.
 */

import { TimelineEvent, StageIODefinition, RoutingDiagnosticsData } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD ROUTE TIMELINE EVENTS (Urgency: Medium / Normal)
// ─────────────────────────────────────────────────────────────────────────────
export const STANDARD_ROUTE_EVENTS: TimelineEvent[] = [
  {
    id: 'std-evt-1',
    sequenceNumber: 1,
    eventType: 'pipeline_started',
    agentId: 'orchestrator',
    sourceComponent: 'LangGraph Supervisor Orchestrator',
    title: 'Pipeline Initialization',
    message: 'MediGuard AI pipeline initiated for session demo-std-01',
    simulatedTimestamp: '2026-10-30T09:00:00.000Z [Illustrative]',
    elapsedTimeLabel: 'T+0.00s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 0.1,
    stageId: 'orchestration',
    dataPayload: {
      total_agents: 5,
      agents_sequence: ['intake', 'symptom', 'diagnosis', 'drug_check', 'report'],
      _simulation_note: 'Illustrative payload matching backend/app/schemas/websocket.py'
    },
    plainLanguageExplanation:
      'The LangGraph orchestrator initialized the shared AgentState carrying session context, empty clinical output slots, and configured supervisor channels. Control is handed to the Intake Agent.',
    nextTransition: 'Graph Edge: START -> intake node'
  },
  {
    id: 'std-evt-2',
    sequenceNumber: 2,
    eventType: 'agent_started',
    agentId: 'intake',
    sourceComponent: 'Intake Specialist Agent',
    title: 'Intake Agent Started',
    message: 'Intake Agent parsing patient demographic and clinical data...',
    simulatedTimestamp: '2026-10-30T09:00:00.100Z [Illustrative]',
    elapsedTimeLabel: 'T+0.10s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 1.8,
    stageId: 'intake',
    dataPayload: {
      agent_display_name: 'Intake Agent',
      agent_icon: 'clipboard-list',
      estimated_seconds: 8
    },
    plainLanguageExplanation:
      'Intake agent received raw chief complaint ("Exertional chest discomfort and shortness of breath for 3 days"), past history (hypertension, hyperlipidemia), and home medications. Sanitizes PHI and begins semantic parsing.',
    nextTransition: 'Internal LLM prompt execution and clinical parameter extraction'
  },
  {
    id: 'std-evt-3',
    sequenceNumber: 3,
    eventType: 'agent_completed',
    agentId: 'intake',
    sourceComponent: 'Intake Specialist Agent',
    title: 'Intake Agent Completed',
    message: 'Intake Agent parsing complete. Structured clinical intake populated.',
    simulatedTimestamp: '2026-10-30T09:00:01.900Z [Illustrative]',
    elapsedTimeLabel: 'T+1.90s (+1.8s elapsed, Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 1.8,
    stageId: 'intake',
    dataPayload: {
      duration_seconds: 1.8,
      intake_confidence: 0.94,
      normalized_symptoms: ['exertional chest tightness', 'dyspnea on exertion'],
      red_flags: []
    },
    plainLanguageExplanation:
      'Parsed intake produced normalized clinical symptoms with 94% extraction confidence. No immediate panic red flags detected during raw ingestion. State updated with parsed_intake.',
    nextTransition: 'Graph Edge: intake -> symptom node'
  },
  {
    id: 'std-evt-4',
    sequenceNumber: 4,
    eventType: 'agent_started',
    agentId: 'symptom',
    sourceComponent: 'Symptom Ontology & RAG Agent',
    title: 'Symptom Agent Started',
    message: 'Symptom Agent analyzing symptom severity and querying PubMed RAG context...',
    simulatedTimestamp: '2026-10-30T09:00:02.000Z [Illustrative]',
    elapsedTimeLabel: 'T+2.00s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 2.2,
    stageId: 'symptom',
    dataPayload: {
      agent_display_name: 'Symptom Agent',
      agent_icon: 'activity',
      estimated_seconds: 12
    },
    plainLanguageExplanation:
      'Symptom agent queried PubMed vector embeddings (Pinecone) with "exertional chest tightness dyspnea" and mapped symptoms to ICD-10/SNOMED categories (Cardiovascular / Respiratory).',
    nextTransition: 'Internal vector search and clinical severity grading'
  },
  {
    id: 'std-evt-5',
    sequenceNumber: 5,
    eventType: 'agent_completed',
    agentId: 'symptom',
    sourceComponent: 'Symptom Ontology & RAG Agent',
    title: 'Symptom Agent Completed (Medium Urgency)',
    message: 'Symptom Agent completed analysis. Acuity categorized as moderate.',
    simulatedTimestamp: '2026-10-30T09:00:04.200Z [Illustrative]',
    elapsedTimeLabel: 'T+4.20s (+2.2s elapsed, Illustrative)',
    isParallel: false,
    eventGroup: 'safety',
    status: 'completed',
    illustrativeDurationSeconds: 2.2,
    stageId: 'symptom',
    dataPayload: {
      duration_seconds: 2.2,
      symptom_severity: 'moderate',
      urgency_level: 'medium',
      requires_emergency: false,
      symptom_categories: ['Cardiovascular', 'Respiratory']
    },
    plainLanguageExplanation:
      'Symptom Agent concluded patient exhibits moderate subacute symptoms without active instability. Urgency assigned to "medium". Retrieved 5 guideline context chunks into state.',
    nextTransition: 'LangGraph Conditional Edge: _conditional_route_after_symptom(state)'
  },
  {
    id: 'std-evt-6',
    sequenceNumber: 6,
    eventType: 'agent_started',
    agentId: 'orchestrator',
    sourceComponent: 'LangGraph Supervisor (Conditional Safety Gate)',
    title: 'Safety Gate Evaluated: Normal Routing',
    message: 'Urgency is "medium". Conditional safety gate routes to parallel "diagnosis" node.',
    simulatedTimestamp: '2026-10-30T09:00:04.250Z [Illustrative]',
    elapsedTimeLabel: 'T+4.25s (Illustrative)',
    isParallel: false,
    eventGroup: 'safety',
    status: 'completed',
    illustrativeDurationSeconds: 0.05,
    stageId: 'orchestration',
    dataPayload: {
      conditional_edge: '_conditional_route_after_symptom',
      evaluated_urgency: 'medium',
      routing_decision: 'diagnosis',
      emergency_gate_triggered: false
    },
    plainLanguageExplanation:
      'The orchestrator safety gate function examined state["urgency_level"]. Because urgency is "medium" (not "critical"), the standard diagnostic pathway is followed. The registered "diagnosis" node is invoked.',
    nextTransition: 'Node Dispatch: "diagnosis" node (parallel_clinical_analysis coroutine)'
  },
  {
    id: 'std-evt-7',
    sequenceNumber: 7,
    eventType: 'agent_started',
    agentId: 'diagnosis',
    sourceComponent: 'Parallel Reasoning Swarm (Diagnosis Task)',
    title: 'Parallel Branch 1: Diagnosis Agent Started',
    message: 'Diagnosis Agent executing concurrently via asyncio.create_task: generating ranked DDx...',
    simulatedTimestamp: '2026-10-30T09:00:04.300Z [Illustrative]',
    elapsedTimeLabel: 'T+4.30s (Illustrative)',
    isParallel: true,
    parallelBranch: 'diagnosis',
    eventGroup: 'parallel',
    status: 'completed',
    illustrativeDurationSeconds: 3.5,
    stageId: 'diagnosis',
    dataPayload: {
      agent_display_name: 'Diagnosis Agent',
      agent_icon: 'search',
      estimated_seconds: 20,
      concurrency_mode: 'asyncio.create_task inside parallel_clinical_analysis'
    },
    plainLanguageExplanation:
      'Within the registered "diagnosis" node, the orchestrator spawned diagnosis_agent.run() concurrently alongside drug_agent.run(). Diagnosis agent begins multi-hypothesis differential formulation with PubMed RAG.',
    nextTransition: 'Concurrent execution of DDx reasoning while Drug Agent screens medications'
  },
  {
    id: 'std-evt-8',
    sequenceNumber: 8,
    eventType: 'agent_started',
    agentId: 'drug_check',
    sourceComponent: 'Parallel Safety Swarm (Drug Agent Task)',
    title: 'Parallel Branch 2: Drug Agent Started',
    message: 'Drug Agent executing concurrently via asyncio.create_task: screening OpenFDA interactions...',
    simulatedTimestamp: '2026-10-30T09:00:04.310Z [Illustrative]',
    elapsedTimeLabel: 'T+4.31s (Illustrative)',
    isParallel: true,
    parallelBranch: 'drug_check',
    eventGroup: 'parallel',
    status: 'completed',
    illustrativeDurationSeconds: 2.8,
    stageId: 'drug_check',
    dataPayload: {
      agent_display_name: 'Drug Agent',
      agent_icon: 'pill',
      estimated_seconds: 8,
      concurrency_mode: 'asyncio.create_task inside parallel_clinical_analysis'
    },
    plainLanguageExplanation:
      'Concurrently with Diagnosis Agent, the Drug Agent queries OpenFDA NDC database with active patient medications (Amlodipine 5mg, Atorvastatin 20mg, Aspirin 81mg) and evaluates drug-drug and allergy conflicts.',
    nextTransition: 'Concurrent OpenFDA API querying and black-box warning verification'
  },
  {
    id: 'std-evt-9',
    sequenceNumber: 9,
    eventType: 'agent_completed',
    agentId: 'drug_check',
    sourceComponent: 'Parallel Safety Swarm (Drug Agent Task)',
    title: 'Parallel Branch 2: Drug Agent Completed',
    message: 'Drug Agent verified: 0 high-risk contraindications detected; medications cleared.',
    simulatedTimestamp: '2026-10-30T09:00:07.110Z [Illustrative]',
    elapsedTimeLabel: 'T+7.11s (+2.8s elapsed, Illustrative)',
    isParallel: true,
    parallelBranch: 'drug_check',
    eventGroup: 'parallel',
    status: 'completed',
    illustrativeDurationSeconds: 2.8,
    stageId: 'drug_check',
    dataPayload: {
      duration_seconds: 2.8,
      interactions_found: 0,
      contraindications_count: 0,
      medication_safe: true,
      fda_data_used: true
    },
    plainLanguageExplanation:
      'Drug Agent finished first in the parallel pool. Cleared all 3 home medications against FDA contraindication catalogs. Results held in memory awaiting completion of the Diagnosis Agent task.',
    nextTransition: 'Awaiting completion of Parallel Branch 1 (Diagnosis Agent) at asyncio.gather join'
  },
  {
    id: 'std-evt-10',
    sequenceNumber: 10,
    eventType: 'agent_completed',
    agentId: 'diagnosis',
    sourceComponent: 'Parallel Reasoning Swarm (Diagnosis Task)',
    title: 'Parallel Branch 1: Diagnosis Agent Completed',
    message: 'Diagnosis Agent verified: Ranked 4 differential candidates (Primary: Angina Pectoris).',
    simulatedTimestamp: '2026-10-30T09:00:07.800Z [Illustrative]',
    elapsedTimeLabel: 'T+7.80s (+3.5s elapsed, Illustrative)',
    isParallel: true,
    parallelBranch: 'diagnosis',
    eventGroup: 'parallel',
    status: 'completed',
    illustrativeDurationSeconds: 3.5,
    stageId: 'diagnosis',
    dataPayload: {
      duration_seconds: 3.5,
      ddx_count: 4,
      primary_diagnosis: 'Angina Pectoris / Stable Ischemic Heart Disease',
      confidence: 0.82,
      citations_count: 5
    },
    plainLanguageExplanation:
      'Diagnosis Agent synthesized 4 ranked differentials backed by PubMed evidence citations. Both parallel tasks are now finished.',
    nextTransition: 'Synchronization Join: asyncio.gather resolves -> Orchestrator merges states'
  },
  {
    id: 'std-evt-11',
    sequenceNumber: 11,
    eventType: 'agent_completed',
    agentId: 'orchestrator',
    sourceComponent: 'LangGraph Supervisor (Parallel Sync Point)',
    title: 'Parallel Tasks Merged & Synchronized',
    message: 'asyncio.gather joined diagnosis + drug_check results into unified AgentState.',
    simulatedTimestamp: '2026-10-30T09:00:07.820Z [Illustrative]',
    elapsedTimeLabel: 'T+7.82s (Illustrative)',
    isParallel: true,
    parallelBranch: 'sync_point',
    eventGroup: 'parallel',
    status: 'completed',
    illustrativeDurationSeconds: 0.02,
    stageId: 'orchestration',
    dataPayload: {
      merge_point: 'parallel_clinical_analysis completion',
      merged_fields: ['differential_diagnosis', 'primary_diagnosis', 'drug_interactions', 'contraindications', 'medication_safe'],
      completed_agents_updated: ['diagnosis', 'drug_check'],
      latency_reduction_estimated: '35-40% compared to serial execution'
    },
    plainLanguageExplanation:
      'The parallel execution wrapper completed. Orchestrator merged the outputs from both tasks into the single master AgentState, added both "diagnosis" and "drug_check" to completed_agents, and directed flow to the Report Agent.',
    nextTransition: 'Graph Edge: diagnosis -> report node'
  },
  {
    id: 'std-evt-12',
    sequenceNumber: 12,
    eventType: 'agent_started',
    agentId: 'report',
    sourceComponent: 'Report Synthesis Agent',
    title: 'Report Agent Started',
    message: 'Report Agent compiling comprehensive physician report and patient discharge plan...',
    simulatedTimestamp: '2026-10-30T09:00:07.850Z [Illustrative]',
    elapsedTimeLabel: 'T+7.85s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 3.1,
    stageId: 'report',
    dataPayload: {
      agent_display_name: 'Report Agent',
      agent_icon: 'file-text',
      estimated_seconds: 15
    },
    plainLanguageExplanation:
      'Report Agent reads all accumulated state fields (intake, symptoms, DDx, drug screening, RAG citations) and generates a structured clinical report and plain-language patient summary.',
    nextTransition: 'Dual-persona report synthesis with clinical disclaimers'
  },
  {
    id: 'std-evt-13',
    sequenceNumber: 13,
    eventType: 'agent_completed',
    agentId: 'report',
    sourceComponent: 'Report Synthesis Agent',
    title: 'Report Agent Completed',
    message: 'Report Agent completed. Finalized report and FHIR bundle generated.',
    simulatedTimestamp: '2026-10-30T09:00:10.950Z [Illustrative]',
    elapsedTimeLabel: 'T+10.95s (+3.1s elapsed, Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 3.1,
    stageId: 'report',
    dataPayload: {
      duration_seconds: 3.1,
      urgency_level: 'medium',
      report_generated: true,
      has_patient_discharge_summary: true
    },
    plainLanguageExplanation:
      'Report Agent synthesized physician clinical briefing, patient care pass, and FHIR R4 composition. Attached mandatory CDSS disclaimers. Marked report_generated=True in AgentState.',
    nextTransition: 'Graph Edge: report -> END'
  },
  {
    id: 'std-evt-14',
    sequenceNumber: 14,
    eventType: 'pipeline_completed',
    agentId: 'orchestrator',
    sourceComponent: 'LangGraph Supervisor Orchestrator',
    title: 'Pipeline Run Complete',
    message: 'Clinical analysis complete. Report ready for physician review.',
    simulatedTimestamp: '2026-10-30T09:00:11.000Z [Illustrative]',
    elapsedTimeLabel: 'T+11.00s (Total: 11.0s, Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 0.05,
    stageId: 'orchestration',
    dataPayload: {
      total_duration_seconds: 11.0,
      urgency_level: 'medium',
      primary_diagnosis: 'Angina Pectoris / Stable Ischemic Heart Disease',
      ddx_count: 4,
      report_generated: true
    },
    plainLanguageExplanation:
      'All nodes in the standard pipeline finished successfully. The completed pipeline telemetry broadcast was delivered to the client. Session is ready for clinician sign-off.',
    nextTransition: 'Pipeline Terminated: END'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL ROUTE TIMELINE EVENTS (Urgency: Critical / Emergency Gate Triggered)
// ─────────────────────────────────────────────────────────────────────────────
export const CRITICAL_ROUTE_EVENTS: TimelineEvent[] = [
  {
    id: 'crit-evt-1',
    sequenceNumber: 1,
    eventType: 'pipeline_started',
    agentId: 'orchestrator',
    sourceComponent: 'LangGraph Supervisor Orchestrator',
    title: 'Pipeline Initialization (Critical Case)',
    message: 'MediGuard AI pipeline initiated for session demo-crit-02',
    simulatedTimestamp: '2026-10-30T09:15:00.000Z [Illustrative]',
    elapsedTimeLabel: 'T+0.00s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 0.1,
    stageId: 'orchestration',
    dataPayload: {
      total_agents: 5,
      agents_sequence: ['intake', 'symptom', 'diagnosis', 'drug_check', 'report'],
      _simulation_note: 'Illustrative emergency trace'
    },
    plainLanguageExplanation:
      'The LangGraph supervisor initialized state for an emergency intake. Standard sequence is planned, subject to safety gate evaluation.',
    nextTransition: 'Graph Edge: START -> intake node'
  },
  {
    id: 'crit-evt-2',
    sequenceNumber: 2,
    eventType: 'agent_started',
    agentId: 'intake',
    sourceComponent: 'Intake Specialist Agent',
    title: 'Intake Agent Started',
    message: 'Intake Agent parsing emergency complaint: acute crushing substernal chest pain...',
    simulatedTimestamp: '2026-10-30T09:15:00.100Z [Illustrative]',
    elapsedTimeLabel: 'T+0.10s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 1.5,
    stageId: 'intake',
    dataPayload: {
      agent_display_name: 'Intake Agent',
      agent_icon: 'clipboard-list',
      estimated_seconds: 8
    },
    plainLanguageExplanation:
      'Intake agent processes acute symptoms: sudden onset crushing substernal chest pressure, radiation to left jaw and shoulder, profound diaphoresis, and hypotension (BP 88/54).',
    nextTransition: 'Parsing emergency symptoms and red flag extraction'
  },
  {
    id: 'crit-evt-3',
    sequenceNumber: 3,
    eventType: 'agent_completed',
    agentId: 'intake',
    sourceComponent: 'Intake Specialist Agent',
    title: 'Intake Agent Completed (High-Risk Red Flags)',
    message: 'Intake Agent parsing complete. Multiple critical red flags flagged.',
    simulatedTimestamp: '2026-10-30T09:15:01.600Z [Illustrative]',
    elapsedTimeLabel: 'T+1.60s (+1.5s elapsed, Illustrative)',
    isParallel: false,
    eventGroup: 'safety',
    status: 'completed',
    illustrativeDurationSeconds: 1.5,
    stageId: 'intake',
    dataPayload: {
      duration_seconds: 1.5,
      intake_confidence: 0.98,
      normalized_symptoms: ['crushing chest pain', 'radiation to jaw', 'diaphoresis', 'hypotension'],
      red_flags: ['Hemodynamic instability', 'Ischemia symptoms > 20 mins', 'Hypotension (BP < 90 systolic)']
    },
    plainLanguageExplanation:
      'Intake agent confirmed high-risk clinical presentation. Extracted 3 alarming red flags into state["parsed_intake"]. Control passes to Symptom Agent.',
    nextTransition: 'Graph Edge: intake -> symptom node'
  },
  {
    id: 'crit-evt-4',
    sequenceNumber: 4,
    eventType: 'agent_started',
    agentId: 'symptom',
    sourceComponent: 'Symptom Ontology & RAG Agent',
    title: 'Symptom Agent Started',
    message: 'Symptom Agent analyzing emergency triage presentation...',
    simulatedTimestamp: '2026-10-30T09:15:01.700Z [Illustrative]',
    elapsedTimeLabel: 'T+1.70s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 1.8,
    stageId: 'symptom',
    dataPayload: {
      agent_display_name: 'Symptom Agent',
      agent_icon: 'activity',
      estimated_seconds: 12
    },
    plainLanguageExplanation:
      'Symptom Agent classifies severity against emergency triage matrices (ESI Level 1 / Critical Resuscitation).',
    nextTransition: 'Acuity calculation and emergency triage scoring'
  },
  {
    id: 'crit-evt-5',
    sequenceNumber: 5,
    eventType: 'agent_completed',
    agentId: 'symptom',
    sourceComponent: 'Symptom Ontology & RAG Agent',
    title: 'Symptom Agent Completed (Critical Urgency Triggered)',
    message: 'EMERGENCY FLAG — Critical triage detected. state["urgency_level"] set to "critical".',
    simulatedTimestamp: '2026-10-30T09:15:03.500Z [Illustrative]',
    elapsedTimeLabel: 'T+3.50s (+1.8s elapsed, Illustrative)',
    isParallel: false,
    eventGroup: 'safety',
    status: 'completed',
    illustrativeDurationSeconds: 1.8,
    stageId: 'symptom',
    dataPayload: {
      duration_seconds: 1.8,
      symptom_severity: 'critical',
      urgency_level: 'critical',
      requires_emergency: true,
      triage_recommendation: 'Immediate resuscitation / Cath Lab code'
    },
    plainLanguageExplanation:
      'Symptom Agent raised an EMERGENCY ALERT. The presentation meets high-acuity acute coronary syndrome / cardiogenic shock criteria. Sets urgency_level = "critical".',
    nextTransition: 'LangGraph Conditional Edge: _conditional_route_after_symptom(state)'
  },
  {
    id: 'crit-evt-6',
    sequenceNumber: 6,
    eventType: 'agent_started',
    agentId: 'orchestrator',
    sourceComponent: 'LangGraph Supervisor (Emergency Gate)',
    title: '🚨 Emergency Gate Triggered: Fast-Track Bypass Active',
    message: 'urgency_level == "critical" -> Bypassing diagnosis and drug_check. Fast-tracking to report!',
    simulatedTimestamp: '2026-10-30T09:15:03.550Z [Illustrative]',
    elapsedTimeLabel: 'T+3.55s (Illustrative)',
    isParallel: false,
    eventGroup: 'safety',
    status: 'completed',
    illustrativeDurationSeconds: 0.05,
    stageId: 'orchestration',
    dataPayload: {
      conditional_edge: '_conditional_route_after_symptom',
      evaluated_urgency: 'critical',
      routing_decision: 'report',
      emergency_gate_triggered: true,
      bypassed_node: 'diagnosis',
      bypassed_tasks: ['diagnosis_agent', 'drug_agent']
    },
    plainLanguageExplanation:
      'CRITICAL SAFETY GATE ACTIVATION: In backend/app/agents/orchestrator.py, _conditional_route_after_symptom() evaluates urgency == "critical". It immediately returns "report", completely bypassing the registered "diagnosis" node (and its parallel diagnosis + drug check tasks). This prevents delaying emergency physician notification with lengthy DDx debates.',
    nextTransition: 'Fast-Track Bypass Edge: symptom -> report node (diagnosis bypassed)'
  },
  {
    id: 'crit-evt-7',
    sequenceNumber: 7,
    eventType: 'agent_started',
    agentId: 'diagnosis',
    sourceComponent: 'Registered Graph Node: diagnosis',
    title: 'Diagnosis Node: Bypassed by Emergency Gate',
    message: 'Full differential diagnosis formulation and literature vector search bypassed for immediate patient stabilization.',
    simulatedTimestamp: '2026-10-30T09:15:03.560Z [Illustrative]',
    elapsedTimeLabel: 'T+3.56s (Bypassed, Illustrative)',
    isParallel: true,
    parallelBranch: 'diagnosis',
    eventGroup: 'safety',
    status: 'skipped',
    stageId: 'diagnosis',
    dataPayload: {
      status: 'skipped',
      reason: 'Emergency fast-track safety bypass triggered by critical triage acuity.',
      architectural_node: 'diagnosis',
      internal_task: 'diagnosis_agent.run'
    },
    plainLanguageExplanation:
      'The diagnosis graph node was skipped. In a life-threatening crisis, spending 20-30s searching literature for secondary differentials could delay critical physician intervention.',
    nextTransition: 'Task bypassed in graph execution'
  },
  {
    id: 'crit-evt-8',
    sequenceNumber: 8,
    eventType: 'agent_started',
    agentId: 'drug_check',
    sourceComponent: 'Internal Specialist Task: drug_check',
    title: 'Drug Check Task: Bypassed by Emergency Gate',
    message: 'Elective drug interaction matrix check bypassed; emergency stabilization takes precedence.',
    simulatedTimestamp: '2026-10-30T09:15:03.570Z [Illustrative]',
    elapsedTimeLabel: 'T+3.57s (Bypassed, Illustrative)',
    isParallel: true,
    parallelBranch: 'drug_check',
    eventGroup: 'safety',
    status: 'skipped',
    stageId: 'drug_check',
    dataPayload: {
      status: 'skipped',
      reason: 'Bypassed concurrently as part of diagnosis node bypass.',
      internal_task: 'drug_agent.run'
    },
    plainLanguageExplanation:
      'The drug check task (which lives inside the diagnosis wrapper) was also skipped. Acute emergency resuscitation protocol takes precedence over non-urgent medication interaction screening.',
    nextTransition: 'Task bypassed in graph execution'
  },
  {
    id: 'crit-evt-9',
    sequenceNumber: 9,
    eventType: 'agent_started',
    agentId: 'report',
    sourceComponent: 'Report Synthesis Agent (Emergency Fast-Track)',
    title: 'Report Agent Started (Emergency Mode)',
    message: 'Report Agent compiling immediate emergency alert brief and critical resuscitation directives...',
    simulatedTimestamp: '2026-10-30T09:15:03.600Z [Illustrative]',
    elapsedTimeLabel: 'T+3.60s (Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 2.0,
    stageId: 'report',
    dataPayload: {
      agent_display_name: 'Report Agent',
      agent_icon: 'file-text',
      estimated_seconds: 15,
      emergency_fast_track: true
    },
    plainLanguageExplanation:
      'Report Agent synthesizes emergency physician alerts, critical triage summary, and stabilization checklists directly from intake and symptom triage data.',
    nextTransition: 'Emergency brief generation'
  },
  {
    id: 'crit-evt-10',
    sequenceNumber: 10,
    eventType: 'agent_completed',
    agentId: 'report',
    sourceComponent: 'Report Synthesis Agent (Emergency Fast-Track)',
    title: 'Report Agent Completed (Emergency Brief Finalized)',
    message: 'Emergency report synthesized. Critical alerts highlighted for immediate attending action.',
    simulatedTimestamp: '2026-10-30T09:15:05.600Z [Illustrative]',
    elapsedTimeLabel: 'T+5.60s (+2.0s elapsed, Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 2.0,
    stageId: 'report',
    dataPayload: {
      duration_seconds: 2.0,
      urgency_level: 'critical',
      report_generated: true,
      emergency_alert_banner: 'ACTIVE CODE STEMI / RESUSCITATION PROTOCOL'
    },
    plainLanguageExplanation:
      'Report Agent completed emergency brief generation in ~2.0s (illustrative), enabling attending physicians to receive actionable stabilization directives in ~5.6s total pipeline time.',
    nextTransition: 'Graph Edge: report -> END'
  },
  {
    id: 'crit-evt-11',
    sequenceNumber: 11,
    eventType: 'pipeline_completed',
    agentId: 'orchestrator',
    sourceComponent: 'LangGraph Supervisor Orchestrator',
    title: 'Critical Emergency Pipeline Complete',
    message: 'Emergency pipeline completed via fast-track bypass. Attending notified.',
    simulatedTimestamp: '2026-10-30T09:15:05.650Z [Illustrative]',
    elapsedTimeLabel: 'T+5.65s (Total: 5.65s, Illustrative)',
    isParallel: false,
    eventGroup: 'workflow',
    status: 'completed',
    illustrativeDurationSeconds: 0.05,
    stageId: 'orchestration',
    dataPayload: {
      total_duration_seconds: 5.65,
      urgency_level: 'critical',
      primary_diagnosis: 'Acute Coronary Syndrome (STEMI Suspected)',
      report_generated: true,
      emergency_bypass_active: true
    },
    plainLanguageExplanation:
      'Emergency pipeline run complete. Notice the dramatic latency reduction (~5.6s vs ~11.0s) due to the architectural emergency gate bypassing the diagnosis and drug screening nodes.',
    nextTransition: 'Pipeline Terminated: END'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// STAGE INPUT / OUTPUT DEFINITIONS (Source-Verified against AgentState schema)
// ─────────────────────────────────────────────────────────────────────────────
export const STAGE_IO_DEFINITIONS: Record<string, StageIODefinition> = {
  intake: {
    stageId: 'intake',
    stageName: 'Stage 1: Clinical Intake Normalization',
    registeredGraphNode: 'intake',
    specialistTasks: ['IntakeAgent.run', 'MultimodalAgent.run (optional attachments)'],
    upstreamNodes: ['START'],
    downstreamNodes: ['symptom'],
    clinicalRationale:
      'Normalizes unstructured clinician intake, voice dictation, or FHIR imports into structured clinical parameters while scrubbing Protected Health Information (PHI).',
    inputs: [
      {
        field: 'patient_data',
        type: 'Dict[str, Any]',
        description: 'Raw patient input payload (chief_complaint, history, vitals, current_medications, allergies, attachments)',
        source: 'Client HTTP POST /api/v1/patient/session',
        verified: true,
        illustrativeValue: {
          chief_complaint: 'Crushing chest tightness radiating to left arm',
          patient_age: 58,
          patient_gender: 'male',
          vitals: { blood_pressure: '148/92', heart_rate: 98, o2_saturation: 96 }
        }
      },
      {
        field: 'session_id',
        type: 'str (UUID)',
        description: 'Unique patient session identifier for telemetry and DB persistence',
        source: 'Supabase patient_sessions table',
        verified: true,
        illustrativeValue: '9f8b2c41-3a1b-4f98-90c1-8419c82410bf'
      }
    ],
    outputs: [
      {
        field: 'parsed_intake',
        type: 'Dict[str, Any]',
        description: 'Structured clinical extraction: patient_summary, normalized_symptoms, symptom_onset, red_flags, intake_confidence',
        destination: 'Downstream symptom, diagnosis, and report agents',
        verified: true,
        illustrativeValue: {
          patient_summary: '58yo male with acute exertional chest pressure and dyspnea.',
          normalized_symptoms: ['acute chest pressure', 'left arm radiation', 'dyspnea'],
          red_flags: ['Radiation to upper extremity', 'Elevated systolic BP'],
          intake_confidence: 0.94
        }
      },
      {
        field: 'intake_confidence',
        type: 'float (0.0 - 1.0)',
        description: 'Confidence score computed during entity parsing',
        destination: 'Telemetry broadcast and audit trail',
        verified: true,
        illustrativeValue: 0.94
      }
    ],
    stateChanges: [
      {
        field: 'parsed_intake',
        changeType: 'created',
        explanation: 'Populated from empty dict to structured JSON with normalized symptoms and red flags.'
      },
      {
        field: 'intake_confidence',
        changeType: 'modified',
        explanation: 'Updated from initial 0.0 default to calibrated 0.94 score.'
      },
      {
        field: 'completed_agents',
        changeType: 'modified',
        explanation: 'Appended "intake" to completed_agents list.'
      }
    ]
  },
  symptom: {
    stageId: 'symptom',
    stageName: 'Stage 2: Symptom Ontology & Acuity Triage',
    registeredGraphNode: 'symptom',
    specialistTasks: ['SymptomAgent.run', 'MedicalRetriever.retrieve (PubMed RAG pass 1)'],
    upstreamNodes: ['intake'],
    downstreamNodes: ['diagnosis (Standard)' , 'report (Emergency Bypass)'],
    clinicalRationale:
      'Maps normalized symptoms to medical ontologies, grades severity, queries PubMed clinical reference vectors, and acts as the safety gate for emergency triage.',
    inputs: [
      {
        field: 'parsed_intake',
        type: 'Dict[str, Any]',
        description: 'Output from Stage 1 containing normalized symptoms, summary, and red flags',
        source: 'Stage 1 (IntakeAgent)',
        verified: true,
        illustrativeValue: {
          normalized_symptoms: ['acute chest pressure', 'left arm radiation', 'dyspnea']
        }
      },
      {
        field: 'patient_data.chief_complaint',
        type: 'str',
        description: 'Original complaint vector string used to formulate PubMed RAG query',
        source: 'Initial AgentState',
        verified: true,
        illustrativeValue: 'Crushing chest tightness radiating to left arm'
      }
    ],
    outputs: [
      {
        field: 'symptoms_analysis',
        type: 'Dict[str, Any]',
        description: 'Detailed analysis: severity_score, affected_systems, triage_recommendation, red_flag_verification',
        destination: 'Downstream diagnosis and report agents',
        verified: true,
        illustrativeValue: {
          symptom_severity: 'moderate',
          symptom_categories: ['Cardiovascular', 'Respiratory'],
          requires_emergency: false
        }
      },
      {
        field: 'urgency_level',
        type: 'str (low | medium | high | critical)',
        description: 'CRITICAL SAFETY GATE VALUE. Dictates whether LangGraph executes the standard or emergency route',
        destination: 'LangGraph conditional edge: _conditional_route_after_symptom',
        verified: true,
        illustrativeValue: 'medium'
      },
      {
        field: 'retrieved_context',
        type: 'str',
        description: 'Top-5 clinical guideline chunks retrieved from Pinecone/PubMed RAG vector store',
        destination: 'Diagnosis and report agent prompt context',
        verified: true,
        illustrativeValue: 'AHA/ACC 2024 Guidelines for Evaluation and Diagnosis of Chest Pain...'
      }
    ],
    stateChanges: [
      {
        field: 'urgency_level',
        changeType: 'modified',
        explanation: 'Evaluated by clinical triage logic and assigned (medium in standard route, critical in emergency route).'
      },
      {
        field: 'retrieved_context',
        changeType: 'created',
        explanation: 'Populated with retrieved PubMed clinical vectors and guideline literature.'
      },
      {
        field: 'completed_agents',
        changeType: 'modified',
        explanation: 'Appended "symptom" to completed_agents list.'
      }
    ]
  },
  diagnosis: {
    stageId: 'diagnosis',
    stageName: 'Stage 3: Parallel Clinical Reasoning & Drug Safety Swarm',
    registeredGraphNode: 'diagnosis',
    specialistTasks: [
      'MediGuardOrchestrator.parallel_clinical_analysis (wrapper coroutine)',
      'DiagnosisAgent.run (Task 1: PubMed Vector RAG + DDx)',
      'DrugAgent.run (Task 2: OpenFDA Interaction Screening)'
    ],
    upstreamNodes: ['symptom (via conditional route)'],
    downstreamNodes: ['report'],
    bypassNote: 'BYPASSED IN CRITICAL EMERGENCY ROUTE by _conditional_route_after_symptom()',
    clinicalRationale:
      'Performs concurrent differential diagnosis generation and pharmacovigilance screening. Combines two high-latency operations into a single parallel execution step to reduce pipeline duration by ~35-40%.',
    inputs: [
      {
        field: 'parsed_intake',
        type: 'Dict[str, Any]',
        description: 'Structured clinical summary from intake stage',
        source: 'Stage 1 (IntakeAgent)',
        verified: true,
        illustrativeValue: {
          normalized_symptoms: ['exertional chest tightness', 'dyspnea on exertion']
        }
      },
      {
        field: 'symptoms_analysis',
        type: 'Dict[str, Any]',
        description: 'Symptom categories and clinical RAG context from symptom stage',
        source: 'Stage 2 (SymptomAgent)',
        verified: true,
        illustrativeValue: {
          symptom_categories: ['Cardiovascular', 'Respiratory']
        }
      },
      {
        field: 'patient_data.current_medications',
        type: 'List[str]',
        description: 'Active home medications screened by DrugAgent against OpenFDA',
        source: 'Initial AgentState',
        verified: true,
        illustrativeValue: ['Amlodipine 5mg', 'Atorvastatin 20mg', 'Aspirin 81mg']
      },
      {
        field: 'patient_data.allergies',
        type: 'List[str]',
        description: 'Patient allergies screened for drug cross-reactivity',
        source: 'Initial AgentState',
        verified: true,
        illustrativeValue: ['Penicillin']
      }
    ],
    outputs: [
      {
        field: 'differential_diagnosis',
        type: 'List[Dict[str, Any]]',
        description: 'Ranked list of differential diagnostic candidates with ICD-10 codes, confidence scores, and rationales',
        destination: 'ReportAgent and final clinical report',
        verified: true,
        illustrativeValue: [
          { diagnosis: 'Angina Pectoris', icd10: 'I20.9', confidence: 0.82 },
          { diagnosis: 'Gastroesophageal Reflux Disease', icd10: 'K21.9', confidence: 0.54 }
        ]
      },
      {
        field: 'primary_diagnosis',
        type: 'Dict[str, Any]',
        description: 'Top-ranked diagnosis candidate from differential ranking',
        destination: 'ReportAgent and UI session card',
        verified: true,
        illustrativeValue: { diagnosis: 'Angina Pectoris', icd10: 'I20.9', confidence: 0.82 }
      },
      {
        field: 'drug_interactions',
        type: 'List[Dict[str, Any]]',
        description: 'Identified drug-drug interactions verified via OpenFDA',
        destination: 'ReportAgent and medication safety alert panel',
        verified: true,
        illustrativeValue: []
      },
      {
        field: 'medication_safe',
        type: 'bool',
        description: 'Safety flag indicating whether all active medications are cleared',
        destination: 'ReportAgent safety review section',
        verified: true,
        illustrativeValue: true
      },
      {
        field: 'fda_data_used',
        type: 'bool',
        description: 'True if OpenFDA live endpoint or fallback FDA label database was used',
        destination: 'ReportAgent provenance metadata',
        verified: true,
        illustrativeValue: true
      }
    ],
    stateChanges: [
      {
        field: 'differential_diagnosis',
        changeType: 'created',
        explanation: 'Populated with 3-6 ranked clinical hypotheses backed by PubMed citations.'
      },
      {
        field: 'primary_diagnosis',
        changeType: 'created',
        explanation: 'Assigned top-ranked hypothesis object from differential list.'
      },
      {
        field: 'drug_interactions',
        changeType: 'created',
        explanation: 'Populated with detected OpenFDA contraindication matrices.'
      },
      {
        field: 'completed_agents',
        changeType: 'modified',
        explanation: 'Appended BOTH "diagnosis" and "drug_check" to completed_agents upon asyncio.gather completion.'
      }
    ]
  },
  report: {
    stageId: 'report',
    stageName: 'Stage 4: Dual Clinical Report & FHIR Synthesis',
    registeredGraphNode: 'report',
    specialistTasks: ['ReportAgent.run', 'PDFService (visual documentation)', 'FHIRService (R4 bundle)'],
    upstreamNodes: ['diagnosis (Standard Route)', 'symptom (Emergency Bypass Route)'],
    downstreamNodes: ['END'],
    clinicalRationale:
      'Gathers all accumulated AgentState variables and synthesizes both a technical physician briefing (SOAP format) and an accessible 6th-grade level patient discharge guide with mandatory CDSS disclaimers.',
    inputs: [
      {
        field: 'parsed_intake',
        type: 'Dict[str, Any]',
        description: 'Normalized intake data from Stage 1',
        source: 'Stage 1 (IntakeAgent)',
        verified: true,
        illustrativeValue: { patient_summary: '58yo male with acute exertional chest pressure...' }
      },
      {
        field: 'symptoms_analysis',
        type: 'Dict[str, Any]',
        description: 'Acuity and affected body systems',
        source: 'Stage 2 (SymptomAgent)',
        verified: true,
        illustrativeValue: { symptom_severity: 'moderate' }
      },
      {
        field: 'differential_diagnosis',
        type: 'List[Dict[str, Any]]',
        description: 'Differential diagnosis list (or empty list if emergency bypass triggered)',
        source: 'Stage 3 (DiagnosisAgent) or empty fallback if bypassed',
        verified: true,
        illustrativeValue: [{ diagnosis: 'Angina Pectoris', confidence: 0.82 }]
      },
      {
        field: 'drug_interactions',
        type: 'List[Dict[str, Any]]',
        description: 'Detected drug interactions (or empty list if bypassed)',
        source: 'Stage 3 (DrugAgent) or empty fallback if bypassed',
        verified: true,
        illustrativeValue: []
      },
      {
        field: 'urgency_level',
        type: 'str',
        description: 'Clinical urgency level dictating report priority formatting',
        source: 'SymptomAgent or DiagnosisAgent',
        verified: true,
        illustrativeValue: 'medium'
      }
    ],
    outputs: [
      {
        field: 'report',
        type: 'Dict[str, Any]',
        description: 'Physician-grade clinical report with executive summary, DDx, recommendations, and evidence citations',
        destination: 'Supabase reports table and ReportViewer UI',
        verified: true,
        illustrativeValue: {
          executive_summary: '58yo male presenting with stable exertional angina...',
          clinical_recommendations: ['Perform elective stress echocardiography', 'Serial troponins']
        }
      },
      {
        field: 'patient_discharge_summary',
        type: 'Dict[str, Any]',
        description: 'Plain-language patient guidance (6th-grade reading level), home care, red flags, follow-up timeline',
        destination: 'Mobile discharge pass and patient portal',
        verified: true,
        illustrativeValue: {
          condition_explanation: 'Your heart is not getting enough blood when you exert yourself...',
          emergency_red_flags: ['Chest pain that does not stop after 5 minutes of rest', 'Fainting']
        }
      },
      {
        field: 'report_generated',
        type: 'bool',
        description: 'Flag marked True once report compilation and verification succeed',
        destination: 'Session state machine completion check',
        verified: true,
        illustrativeValue: true
      },
      {
        field: 'pipeline_end_time',
        type: 'str (ISO)',
        description: 'UTC ISO timestamp recording exact pipeline completion moment',
        destination: 'Metrics recorder and audit log',
        verified: true,
        illustrativeValue: '2026-10-30T09:00:11.000Z'
      }
    ],
    stateChanges: [
      {
        field: 'report',
        changeType: 'created',
        explanation: 'Synthesized comprehensive clinical report object.'
      },
      {
        field: 'patient_discharge_summary',
        changeType: 'created',
        explanation: 'Synthesized plain-language patient care pass instructions.'
      },
      {
        field: 'report_generated',
        changeType: 'modified',
        explanation: 'Updated from False to True.'
      },
      {
        field: 'pipeline_end_time',
        changeType: 'created',
        explanation: 'Recorded completion timestamp in AgentState.'
      }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING DIAGNOSTICS DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const STANDARD_ROUTING_DIAGNOSTICS: RoutingDiagnosticsData = {
  route: 'standard',
  routeName: 'Standard Clinical Decision Support Pathway',
  routeSummary:
    'Full sequential and parallel reasoning pipeline designed for stable and moderate-acuity presentations. Formulates deep differential diagnoses and runs complete OpenFDA pharmacovigilance screening.',
  triggerCondition: 'state["urgency_level"] != "critical" (e.g. "low", "medium", or "high")',
  conditionalEvaluation: {
    functionName: '_conditional_route_after_symptom(state)',
    evaluatedField: 'state["urgency_level"]',
    evaluatedValue: '"medium"',
    decision: 'Normal CDSS route selected',
    targetNode: 'diagnosis'
  },
  architecturalDistinction: {
    graphNode: 'diagnosis',
    internalTasks: ['DiagnosisAgent.run()', 'DrugAgent.run()'],
    concurrencyMechanism:
      'MediGuardOrchestrator.parallel_clinical_analysis() dispatches asyncio.create_task for both agents and coordinates with asyncio.gather(). Both agents execute concurrently in Python\'s event loop.'
  },
  steps: [
    {
      stepNumber: 1,
      nodeName: 'intake',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Ingests patient complaint, vitals, history, and medications. Strips PHI.',
      clinicalPurpose: 'Privacy-preserving entity extraction and clinical normalization.'
    },
    {
      stepNumber: 2,
      nodeName: 'symptom',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Performs first PubMed RAG pass, maps symptoms to ontologies, and scores severity.',
      clinicalPurpose: 'Acuity evaluation and emergency safety gate checking.'
    },
    {
      stepNumber: 3,
      nodeName: 'Conditional Safety Gate',
      isRegisteredGraphNode: false,
      status: 'completed',
      description: 'Orchestrator evaluates _conditional_route_after_symptom(). Urgency is non-critical -> routes to "diagnosis".',
      clinicalPurpose: 'Safety gate ensures stable patients receive deep differential evaluation.'
    },
    {
      stepNumber: 4,
      nodeName: 'diagnosis (Registered Graph Node)',
      isRegisteredGraphNode: true,
      isParallel: true,
      status: 'completed',
      description: 'Invokes parallel_clinical_analysis() coroutine wrapping concurrent Diagnosis + Drug tasks.',
      clinicalPurpose: 'Coordinated clinical reasoning: concurrent diagnostic formulation and drug screening.'
    },
    {
      stepNumber: 5,
      nodeName: 'report',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Synthesizes technical physician SOAP briefing, patient discharge guide, and FHIR bundle.',
      clinicalPurpose: 'Comprehensive dual-persona clinical documentation.'
    },
    {
      stepNumber: 6,
      nodeName: 'END',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Pipeline terminates; persists state in Supabase and broadcasts completion.',
      clinicalPurpose: 'Session finalized for attending physician review.'
    }
  ]
};

export const CRITICAL_ROUTING_DIAGNOSTICS: RoutingDiagnosticsData = {
  route: 'critical',
  routeName: 'Critical Emergency Fast-Track Bypass Pathway',
  routeSummary:
    'Emergency safety gate path triggered when life-threatening acuity (e.g. STEMI, acute stroke, tension pneumothorax) is detected. Bypasses differential formulation and medication screening to generate urgent physician notifications immediately.',
  triggerCondition: 'state["urgency_level"] == "critical"',
  conditionalEvaluation: {
    functionName: '_conditional_route_after_symptom(state)',
    evaluatedField: 'state["urgency_level"]',
    evaluatedValue: '"critical"',
    decision: 'EMERGENCY GATE TRIGGERED — Fast-track directly to "report"',
    targetNode: 'report'
  },
  whyBypassOccurred:
    'In hyper-acute medical emergencies, every minute matters ("time is muscle" in cardiac arrest; "time is brain" in stroke). The standard diagnosis RAG pass and multi-turn differential debate take 20-30 seconds. To protect patient safety, MediGuard V2 is hardwired with an Emergency Safety Gate: when critical urgency is identified, the supervisor orchestrator immediately bypasses the entire "diagnosis" node (and both of its internal specialist tasks), routing directly to the Report Agent to generate instant stabilization alerts, critical value warnings, and code team notifications without delay.',
  architecturalDistinction: {
    graphNode: 'diagnosis (BYPASSED)',
    internalTasks: ['DiagnosisAgent.run() [SKIPPED]', 'DrugAgent.run() [SKIPPED]'],
    concurrencyMechanism:
      'Because LangGraph edges are conditional, the graph execution pointer transitions directly from "symptom" to "report". The "diagnosis" node coroutine is never invoked, and neither asyncio sub-task is spawned.'
  },
  steps: [
    {
      stepNumber: 1,
      nodeName: 'intake',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Parses emergency complaint and captures critical vital instability / panic biomarkers.',
      clinicalPurpose: 'Immediate identification of acute presentation.'
    },
    {
      stepNumber: 2,
      nodeName: 'symptom',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Detects life-threatening symptom cluster. Sets state["urgency_level"] = "critical".',
      clinicalPurpose: 'Emergency triage identification and alarm trigger.'
    },
    {
      stepNumber: 3,
      nodeName: '🚨 Emergency Safety Gate',
      isRegisteredGraphNode: false,
      status: 'completed',
      description: 'Orchestrator evaluates _conditional_route_after_symptom(). Detected "critical" -> bypasses diagnosis!',
      clinicalPurpose: 'Automated life-safety protocol enforcement.'
    },
    {
      stepNumber: 4,
      nodeName: 'diagnosis (Registered Graph Node)',
      isRegisteredGraphNode: true,
      isParallel: true,
      status: 'bypassed',
      description: 'SKIPPED: Full differential diagnosis reasoning bypassed to prevent critical clinical delay.',
      clinicalPurpose: 'Bypassed for emergency speed.'
    },
    {
      stepNumber: 5,
      nodeName: 'drug_check (Internal Task)',
      isRegisteredGraphNode: false,
      isInternalTask: true,
      status: 'bypassed',
      description: 'SKIPPED: Non-urgent drug interaction audit bypassed during active emergency.',
      clinicalPurpose: 'Bypassed for emergency speed.'
    },
    {
      stepNumber: 6,
      nodeName: 'report',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Compiles immediate emergency brief, critical alerts, and physician handover directives.',
      clinicalPurpose: 'Rapid physician alerting and resuscitation guidance.'
    },
    {
      stepNumber: 7,
      nodeName: 'END',
      isRegisteredGraphNode: true,
      status: 'completed',
      description: 'Pipeline terminates with emergency status broadcast to clinical workstation.',
      clinicalPurpose: 'Attending physician alerted within seconds.'
    }
  ]
};
