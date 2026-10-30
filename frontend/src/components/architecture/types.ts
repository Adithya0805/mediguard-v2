/**
 * MediGuard V2 — Architecture Simulator Types
 * 
 * Defines schemas and interfaces for the Phase 3 Execution Timeline,
 * Event Inspector, Input/Output Inspector, Routing Diagnostics,
 * and Parallel Execution Visualization.
 * 
 * All types strictly align with the real backend schemas:
 * - AgentEventType & AgentEvent (backend/app/schemas/websocket.py)
 * - AgentState (backend/app/schemas/agent.py)
 * - MediGuardOrchestrator graph topology (backend/app/agents/orchestrator.py)
 */

export type SimulationRoute = 'standard' | 'critical';

export type TimelineStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed';

export type EventFilterGroup = 'all' | 'workflow' | 'safety' | 'parallel';

export interface TimelineEvent {
  id: string;
  sequenceNumber: number;
  eventType: string; // 'pipeline_started' | 'agent_started' | 'agent_completed' | 'pipeline_completed' | 'agent_failed' | 'pipeline_failed'
  agentId: string | null; // 'orchestrator' | 'intake' | 'symptom' | 'diagnosis' | 'drug_check' | 'report'
  sourceComponent: string;
  title: string;
  message: string;
  simulatedTimestamp: string; // ISO string marked illustrative
  elapsedTimeLabel: string; // e.g. "T+0.00s", "+2.4s elapsed"
  isParallel: boolean;
  parallelBranch?: 'diagnosis' | 'drug_check' | 'sync_point';
  eventGroup: 'workflow' | 'safety' | 'parallel';
  status: TimelineStepStatus;
  dataPayload: Record<string, any>; // Real backend event payload schema
  plainLanguageExplanation: string;
  nextTransition: string;
  stageId: 'intake' | 'symptom' | 'diagnosis' | 'drug_check' | 'report' | 'orchestration';
  illustrativeDurationSeconds?: number;
}

export interface StageInputField {
  field: string;
  type: string;
  description: string;
  source: string;
  verified: boolean;
  illustrativeValue: any;
}

export interface StageOutputField {
  field: string;
  type: string;
  description: string;
  destination: string;
  verified: boolean;
  illustrativeValue: any;
}

export interface StateChangeField {
  field: string;
  changeType: 'created' | 'modified' | 'untouched' | 'bypassed';
  explanation: string;
  beforeValue?: any;
  afterValue?: any;
}

export interface StageIODefinition {
  stageId: string;
  stageName: string;
  registeredGraphNode: string; // Exact LangGraph node name ('intake', 'symptom', 'diagnosis', 'report')
  specialistTasks: string[]; // Internal tasks executed within or by this node
  upstreamNodes: string[];
  downstreamNodes: string[];
  inputs: StageInputField[];
  outputs: StageOutputField[];
  stateChanges: StateChangeField[];
  clinicalRationale: string;
  bypassNote?: string;
}

export interface RouteStepSummary {
  stepNumber: number;
  nodeName: string;
  isRegisteredGraphNode: boolean;
  isInternalTask?: boolean;
  isParallel?: boolean;
  status: 'active' | 'bypassed' | 'completed';
  description: string;
  clinicalPurpose: string;
}

export interface RoutingDiagnosticsData {
  route: SimulationRoute;
  routeName: string;
  routeSummary: string;
  triggerCondition: string;
  conditionalEvaluation: {
    functionName: string;
    evaluatedField: string;
    evaluatedValue: string;
    decision: string;
    targetNode: string;
  };
  steps: RouteStepSummary[];
  whyBypassOccurred?: string;
  architecturalDistinction: {
    graphNode: string;
    internalTasks: string[];
    concurrencyMechanism: string;
  };
}
