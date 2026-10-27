'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  FileCode, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Database,
  Search,
  Pill,
  FileText,
  FlaskConical,
  ClipboardList
} from 'lucide-react';
import { AgentEvent } from '@/hooks/useAgentStream';

export interface AgentMetadata {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  model: string;
  role: string;
  architecture: string;
  dataSources: string[];
  keyCapabilities: string[];
}

export const AGENT_REGISTRY: Record<string, AgentMetadata> = {
  intake: {
    id: 'intake',
    label: 'Intake Normalizer & PHI Redaction',
    description: 'Parses raw clinical intake, enforces HIPAA de-identification, and structures clinical parameters.',
    icon: ClipboardList,
    model: 'MedLM De-identifier & Entity Normalizer',
    role: 'Clinical Ingestion & Privacy Guardian',
    architecture: 'Zero-retention sanitization pipeline with deterministic rule-based PHI stripping.',
    dataSources: ['Raw Clinician Intake', 'FHIR Resource Bundles', 'Ambient Voice Transcripts'],
    keyCapabilities: [
      'Automatic Safe Harbor HIPAA de-identification',
      'Chief complaint vectorization & semantic extraction',
      'Vitals validation & range threshold flagging (AHA/ACC standards)'
    ]
  },
  multimodal: {
    id: 'multimodal',
    label: 'Multimodal Vision & Labs Agent',
    description: 'Extracts numeric biomarkers with LOINC coding and interprets 12-lead ECG rhythm strips.',
    icon: FlaskConical,
    model: 'Gemini 1.5 Pro Multimodal Vision',
    role: 'Diagnostics & Biomarker Digitizer',
    architecture: 'High-resolution image reasoning node paired with deterministic LOINC catalog matcher.',
    dataSources: ['12-Lead ECG Tracings', 'EHR Laboratory Panels', 'Clinical Photo Attachments'],
    keyCapabilities: [
      'Automated STEMI vs NSTEMI lead-specific elevation detection',
      'LOINC standard code resolution for cardiac enzymes & electrolytes',
      'Critical lab value threshold alerting (Troponin, Potassium, Lactic Acid)'
    ]
  },
  symptom: {
    id: 'symptom',
    label: 'Symptom Ontology & RAG Agent',
    description: 'Maps clinical symptoms to SNOMED-CT / ICD-10 ontologies and performs vector medical retrieval.',
    icon: Activity,
    model: 'MedLM + Hybrid Clinical Vector RAG',
    role: 'Knowledge Graph & Pathophysiology Specialist',
    architecture: 'Ensemble embedding search across peer-reviewed clinical knowledge bases and evidence vectors.',
    dataSources: ['SNOMED-CT Knowledge Graph', 'PubMed Clinical Vectors', 'UpToDate / Harrison’s Curated Guides'],
    keyCapabilities: [
      'Temporal symptom progression & symptom cluster correlation',
      'Emergency red-flag symptom combinations (e.g. chest pressure + diaphoresis)',
      'Severity scoring & acuity index determination'
    ]
  },
  diagnosis: {
    id: 'diagnosis',
    label: 'Multi-Agent Diagnostic Reasoning Swarm',
    description: 'Performs parallel differential diagnostic formulation with calibrated probabilities and reasoning rationales.',
    icon: Search,
    model: 'Gemini 1.5 Pro Clinical Reasoning Swarm',
    role: 'Differential Diagnostic Engine',
    architecture: 'Multi-turn debate between diagnostic sub-agents with adversarial peer-review checking.',
    dataSources: ['Vector Symptom Matches', 'Patient Risk Factors', 'Clinical Practice Guidelines'],
    keyCapabilities: [
      'Ranked differential diagnosis (DDx) with ICD-10 coding and confidence %',
      'Explicit supporting vs counter-evidence clinical reasoning rationales',
      'Emergency rule-out protocol (Aortic Dissection, Pulmonary Embolism, Tension Pneumothorax)'
    ]
  },
  drug_check: {
    id: 'drug_check',
    label: 'OpenFDA Pharmacovigilance Agent',
    description: 'Queries live FDA National Drug Code (NDC) databases to detect severe drug-drug contraindications.',
    icon: Pill,
    model: 'OpenFDA Pharmacovigilance REST Engine',
    role: 'Medication Safety & Interaction Analyst',
    architecture: 'Real-time REST client executing structured FDA NDC queries with deterministic black-box alerts.',
    dataSources: ['OpenFDA Drug Interaction API', 'FDA Black Box Warning Directory', 'NLM RxNorm Database'],
    keyCapabilities: [
      'Severe bleeding & QT prolongation contraindication matrix detection',
      'Geriatric polypharmacy Beers Criteria risk evaluation',
      'Renal / hepatic dosage adjustment guidance'
    ]
  },
  report: {
    id: 'report',
    label: 'Dual Care Report Synthesis Agent',
    description: 'Generates parallel technical physician briefings and plain-language patient discharge guides.',
    icon: FileText,
    model: 'Gemini 1.5 Pro Synthesis Engine',
    role: 'Clinical Documentation & Communication Lead',
    architecture: 'Dual-persona constrained prompt synthesis with Flesch-Kincaid readability scoring.',
    dataSources: ['All Upstream LangGraph Agent States', 'Hospital Audit Logs', 'Institutional Style Directives'],
    keyCapabilities: [
      'Physician-grade structured SOAP/SBAR diagnostic summary',
      'Plain-language (6th-grade reading level) patient guidance & warning signs',
      'Instant cryptographic HIPAA audit trail integration'
    ]
  }
};

interface AgentInspectorModalProps {
  agentId: string | null;
  onClose: () => void;
  status: 'completed' | 'running' | 'failed' | 'waiting' | 'skipped';
  events: AgentEvent[];
  pipelineData: Record<string, any>;
}

export default function AgentInspectorModal({
  agentId,
  onClose,
  status,
  events,
  pipelineData
}: AgentInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'telemetry'>('overview');

  if (!agentId) return null;
  const agent = AGENT_REGISTRY[agentId] || {
    id: agentId,
    label: `${agentId.toUpperCase()} Agent`,
    description: 'Clinical autonomous agent execution node.',
    icon: Cpu,
    model: 'MediGuard Graph Node',
    role: 'Autonomous Reasoning Node',
    architecture: 'LangGraph State Node',
    dataSources: ['EHR Context', 'Live Telemetry'],
    keyCapabilities: ['State transformation', 'Clinical evaluation']
  };

  const Icon = agent.icon;

  // Filter events belonging to this agent
  const agentEvents = events.filter((e) => e.agent_name === agentId);
  const completeEvent = agentEvents.find((e) => e.event_type === 'agent_completed');
  const startEvent = agentEvents.find((e) => e.event_type === 'agent_started');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-border/80 flex items-center justify-between bg-surface-raised/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-sans font-bold text-base text-text-primary">
                    {agent.label}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : status === 'running'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse'
                      : status === 'failed'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-text-muted border border-slate-700'
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 font-mono">
                  Engine: <span className="text-teal-400 font-semibold">{agent.model}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 px-5 pt-3 border-b border-border/60 bg-surface">
            {[
              { id: 'overview', label: 'Architecture & Role', icon: Cpu },
              { id: 'findings', label: 'Extracted Telemetry', icon: Layers },
              { id: 'telemetry', label: 'Raw Event Log', icon: FileCode }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-left text-xs leading-relaxed">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-1">Role Description</h4>
                  <p className="text-text-secondary leading-relaxed bg-background/50 p-3 rounded-xl border border-border/60">
                    {agent.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-background/40 border border-border/60">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Architecture</span>
                    <span className="text-text-primary font-semibold">{agent.architecture}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-background/40 border border-border/60">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Primary Role</span>
                    <span className="text-text-primary font-semibold">{agent.role}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-2">Connected Clinical Evidence Sources</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.dataSources.map((src, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-surface-raised border border-border text-[11px] font-mono text-teal-300">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-2">Core Clinical Capabilities</h4>
                  <div className="space-y-2">
                    {agent.keyCapabilities.map((cap, i) => (
                      <div key={i} className="flex items-start gap-2 text-text-secondary">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'findings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/60">
                  <span className="text-text-secondary">Execution Latency:</span>
                  <span className="font-mono font-bold text-text-primary">
                    {completeEvent?.data?.duration_seconds !== undefined
                      ? `${completeEvent.data.duration_seconds}s`
                      : startEvent?.data?.estimated_seconds 
                      ? `~${startEvent.data.estimated_seconds}s (Est)` 
                      : '0.0s'}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-2">Agent Findings Payload</h4>
                  {completeEvent?.data ? (
                    <div className="p-3.5 rounded-xl bg-background border border-border font-mono text-[11px] text-teal-300 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(completeEvent.data, null, 2)}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-background/40 border border-dashed border-border text-center text-text-muted">
                      {status === 'running' 
                        ? 'Agent is currently processing live reasoning tasks. Output will appear upon completion.'
                        : 'No completed findings recorded yet for this agent node.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'telemetry' && (
              <div className="space-y-3 font-mono text-[11px]">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-2 font-sans">Raw WebSocket Events Recorded</h4>
                {agentEvents.length > 0 ? (
                  agentEvents.map((ev, i) => (
                    <div key={i} className="p-3 rounded-xl bg-background border border-border space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span className="font-bold text-primary">{ev.event_type}</span>
                        <span>{ev.timestamp}</span>
                      </div>
                      <p className="text-text-primary">{ev.message}</p>
                      {ev.data && Object.keys(ev.data).length > 0 && (
                        <div className="text-[10px] text-text-secondary bg-surface-raised p-2 rounded border border-border/40 overflow-x-auto">
                          {JSON.stringify(ev.data, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-xl bg-background/40 border border-dashed border-border text-center text-text-muted font-sans">
                    No discrete WebSocket events logged for this node.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/80 bg-surface-raised/40 flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-mono">
              Session Node: {agent.id}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
