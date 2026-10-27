'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAgentStream } from '@/hooks/useAgentStream';
import { 
  ClipboardList, 
  Activity, 
  Search, 
  Pill, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Loader2, 
  ArrowRight,
  ShieldCheck,
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import AgentInspectorModal from './AgentInspectorModal';
import LiveAgentConsole from './LiveAgentConsole';
import { playClinicalSound } from '@/lib/audio';

interface LiveAgentPipelineProps {
  sessionId: string;
  initialStatus?: string;
  onComplete?: (data: Record<string, any>) => void;
}

const AGENTS = [
  { 
    id: "intake", 
    label: "Intake Agent", 
    description: "Parsing patient data & PHI redaction", 
    icon: ClipboardList,
    estimatedSeconds: 5
  },
  { 
    id: "multimodal", 
    label: "Vision & Labs Agent", 
    description: "LOINC biomarker & ECG intake", 
    icon: FlaskConical,
    estimatedSeconds: 6
  },
  { 
    id: "symptom", 
    label: "Symptom Agent", 
    description: "Analyzing symptoms + RAG", 
    icon: Activity,
    estimatedSeconds: 10
  },
  { 
    id: "diagnosis", 
    label: "Diagnosis Agent", 
    description: "Parallel DDx Reasoning", 
    icon: Search,
    estimatedSeconds: 15
  },
  { 
    id: "drug_check", 
    label: "Drug Agent", 
    description: "Parallel Safety Screening", 
    icon: Pill,
    estimatedSeconds: 8
  },
  { 
    id: "report", 
    label: "Report Agent", 
    description: "Compiling Dual Care Reports", 
    icon: FileText,
    estimatedSeconds: 12
  }
];

function CountdownTimer({ seconds }: { seconds: number }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  return <span className="text-[10px] font-mono opacity-80">~{timeLeft}s left</span>;
}

export default function LiveAgentPipeline({ sessionId, initialStatus, onComplete }: LiveAgentPipelineProps) {
  const router = useRouter();
  const {
    isConnected = false,
    isPipelineRunning = false,
    isPipelineComplete = false,
    events = [],
    currentAgent = null,
    completedAgents = [],
    failedAgents = [],
    pipelineData = {},
    error = null,
    reconnect,
    simulatePipeline,
    clearEvents
  } = useAgentStream(sessionId, initialStatus);

  const [selectedAgentForModal, setSelectedAgentForModal] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false); // default off, one-click on
  const prevCompletedCountRef = useRef(completedAgents.length);
  const completedTriggeredRef = useRef(false);

  // Trigger sound cues on state changes if sound is enabled
  useEffect(() => {
    if (!soundEnabled) return;

    if (completedAgents.length > prevCompletedCountRef.current) {
      playClinicalSound('step');
    }
    prevCompletedCountRef.current = completedAgents.length;
  }, [completedAgents.length, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled) return;

    if (isPipelineComplete) {
      playClinicalSound('complete');
    } else if (error || failedAgents.length > 0) {
      playClinicalSound('alert');
    }
  }, [isPipelineComplete, error, failedAgents.length, soundEnabled]);

  // Trigger parent callback on completion
  useEffect(() => {
    if (isPipelineComplete && onComplete && !completedTriggeredRef.current) {
      completedTriggeredRef.current = true;
      onComplete(pipelineData);
    }
  }, [isPipelineComplete, pipelineData, onComplete]);

  // Calculate overall progress percentage
  const getProgressPercent = () => {
    if (isPipelineComplete) return 100;
    if (completedAgents.length === 0) return 0;
    
    // In emergency critical bypass, we skip diagnosis and drug_check
    const isBypassActive = completedAgents.includes('symptom') && 
                           completedAgents.includes('report') && 
                           !completedAgents.includes('diagnosis');
    
    if (isBypassActive) {
      return (completedAgents.length / 3) * 100;
    }

    return (completedAgents.length / AGENTS.length) * 100;
  };

  const getAgentKeyFinding = (id: string, data: Record<string, any>) => {
    switch (id) {
      case 'intake':
        return data.intake_confidence !== undefined 
          ? `Confidence: ${Math.round(data.intake_confidence * 100)}%` 
          : 'Verified';
      case 'multimodal':
        if (data?.ecg_interpretation?.is_stemi) return '🚨 CRITICAL STEMI';
        if (data?.biomarkers?.length) return `${data.biomarkers.length} LOINC markers`;
        return 'Labs Processed';
      case 'symptom':
        return data.symptom_severity 
          ? `Severity: ${data.symptom_severity}` 
          : 'Verified';
      case 'diagnosis':
        return data.ddx_count !== undefined 
          ? `${data.ddx_count} DDx Formulated` 
          : 'Verified';
      case 'drug_check':
        return data.interactions_found !== undefined 
          ? `${data.interactions_found} Interactions` 
          : 'Verified';
      case 'report':
        return data.urgency_level 
          ? `Urgency: ${data.urgency_level}` 
          : 'Finalized';
      default:
        return 'Verified';
    }
  };

  const handleRunSimulation = () => {
    completedTriggeredRef.current = false;
    if (soundEnabled) {
      playClinicalSound('start');
    }
    simulatePipeline();
  };

  return (
    <div className="w-full flex flex-col gap-6 p-6 rounded-2xl bg-surface border border-border shadow-2xl">
      
      {/* Header and Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-3">
        <div className="flex flex-col gap-0.5 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-sm text-text-primary tracking-wide uppercase">
              MediGuard AI — Multi-Agent Graph Visualizer
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
              LangGraph
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Streamed in real-time via clinical WebSocket telemetry. Click any agent node to inspect telemetry.
          </p>
        </div>

        {/* Live Controls: Simulation Button + Status Indicator */}
        <div className="flex items-center gap-2.5">
          {/* Live Showcase / Replay Button */}
          <button
            onClick={handleRunSimulation}
            disabled={isPipelineRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition-all text-xs font-bold disabled:opacity-50 shadow-sm"
            title="Trigger real-time telemetry replay across all 6 agent nodes"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Showcase Replay</span>
          </button>

          {/* Connection Status */}
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live (WSS)</span>
            </div>
          ) : (
            <button 
              onClick={reconnect}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-text-secondary hover:bg-slate-700 hover:text-text-primary transition-all"
            >
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
              <span>Reconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar with glowing active beacon */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>PIPELINE PROGRESS</span>
          <span className="text-primary font-bold">{Math.round(getProgressPercent())}%</span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden relative border border-border/50">
          <div 
            className={`h-full transition-all duration-700 ease-out ${
              isPipelineComplete 
                ? 'bg-emerald-500' 
                : 'bg-gradient-to-r from-teal-500 via-primary to-cyan-400 shadow-[0_0_12px_rgba(13,148,136,0.5)]'
            }`}
            style={{ width: `${getProgressPercent()}%` }}
          />
        </div>
      </div>

      {/* Nodes Container (Clickable Agent Graph) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 py-2">
        {AGENTS.map((agent, idx) => {
          const isCompleted = completedAgents.includes(agent.id);
          const isFailed = failedAgents.includes(agent.id);
          const isRunning = currentAgent === agent.id;
          
          const isSkipped = isPipelineComplete && !isCompleted && !isFailed;
          const isWaiting = !isCompleted && !isFailed && !isRunning && !isSkipped;
          
          const completeEvent = events.find(
            (e) => e.agent_name === agent.id && e.event_type === 'agent_completed'
          );
          const keyFinding = completeEvent ? getAgentKeyFinding(agent.id, completeEvent.data) : null;
          const AgentIcon = agent.icon;

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgentForModal(agent.id)}
              className={`group relative flex flex-col items-center justify-between text-center p-3.5 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                isRunning 
                  ? 'border-teal-400 bg-teal-500/10 shadow-[0_0_20px_rgba(13,148,136,0.3)] ring-2 ring-teal-400/50' 
                  : isCompleted
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/80'
                  : isFailed
                  ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/80'
                  : isSkipped
                  ? 'border-slate-800 bg-slate-900/40 opacity-50 border-dashed'
                  : 'border-border/80 bg-surface-raised hover:bg-surface-raised/80'
              }`}
            >
              {/* Top Step Number Chip */}
              <div className="w-full flex items-center justify-between text-[10px] font-mono text-text-muted mb-2">
                <span>0{idx + 1}</span>
                <span className="opacity-0 group-hover:opacity-100 text-primary transition-opacity text-[9px] font-sans font-bold flex items-center gap-0.5">
                  <Info className="h-3 w-3" /> Inspect
                </span>
              </div>

              {/* Icon Wrapper with animation states */}
              <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center relative flex-shrink-0 transition-colors my-1 ${
                isRunning
                  ? 'bg-teal-500 text-text-primary border-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.5)]'
                  : isCompleted
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500'
                  : isFailed
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500'
                  : isSkipped
                  ? 'bg-slate-800 text-text-muted border-slate-700'
                  : 'bg-background text-text-muted border-border'
              }`}>
                {isRunning ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : isFailed ? (
                  <XCircle className="h-6 w-6 animate-pulse text-rose-400" />
                ) : (
                  <AgentIcon className="h-5 w-5" />
                )}
              </div>

              {/* Agent Title & Status */}
              <div className="flex flex-col items-center gap-1 mt-2 w-full">
                <span className={`text-xs font-bold font-sans tracking-tight truncate w-full ${
                  isRunning ? 'text-teal-300' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-text-primary'
                }`}>
                  {agent.label}
                </span>

                {/* Subtitle / Finding Badge */}
                <div className="text-[10px] w-full min-h-[1.5rem] flex items-center justify-center">
                  {isRunning ? (
                    <CountdownTimer seconds={agent.estimatedSeconds} />
                  ) : isCompleted ? (
                    <span className="font-semibold text-emerald-400 font-mono text-[9px] bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded truncate max-w-full">
                      {keyFinding}
                    </span>
                  ) : isFailed ? (
                    <span className="text-rose-400 font-semibold">Failed</span>
                  ) : isSkipped ? (
                    <span className="italic text-text-muted">Bypassed</span>
                  ) : (
                    <span className="text-text-muted">Pending</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-left flex flex-col gap-2">
          <div className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">
            Critical Pipeline Error
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* Success Banner */}
      {isPipelineComplete && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
                Clinical Analysis Complete ({pipelineData.total_duration_seconds || '15.0'}s)
              </span>
            </div>
            {pipelineData.primary_diagnosis ? (
              <h4 className="text-base font-bold text-text-primary">
                Primary Case Diagnosis: <span className="text-emerald-400">{pipelineData.primary_diagnosis}</span>
              </h4>
            ) : (
              <h4 className="text-base font-bold text-text-primary">
                AI Clinical Synthesis Finalized
              </h4>
            )}
            <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
              LangGraph orchestration completed without faults. Structured findings compiled into physician-ready report.
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            {pipelineData.urgency_level && (
              <UrgencyBadge urgency={pipelineData.urgency_level} />
            )}
            <button
              onClick={() => router.push(`/report/${sessionId}`)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all font-bold text-sm shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:scale-[1.02]"
            >
              <FileText className="h-4.5 w-4.5" />
              <span>View Full Report</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Streaming Activity Console */}
      <LiveAgentConsole
        events={events}
        isConnected={isConnected}
        isPipelineRunning={isPipelineRunning}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onClearEvents={clearEvents}
      />

      {/* Agent Deep-Dive Inspector Modal */}
      <AgentInspectorModal
        agentId={selectedAgentForModal}
        onClose={() => setSelectedAgentForModal(null)}
        status={
          selectedAgentForModal
            ? completedAgents.includes(selectedAgentForModal)
              ? 'completed'
              : currentAgent === selectedAgentForModal
              ? 'running'
              : failedAgents.includes(selectedAgentForModal)
              ? 'failed'
              : isPipelineComplete
              ? 'skipped'
              : 'waiting'
            : 'waiting'
        }
        events={events}
        pipelineData={pipelineData}
      />

    </div>
  );
}
