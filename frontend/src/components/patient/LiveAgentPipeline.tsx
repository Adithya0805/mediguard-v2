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
  ShieldCheck
} from 'lucide-react';
import UrgencyBadge from '@/components/shared/UrgencyBadge';

interface LiveAgentPipelineProps {
  sessionId: string;
  initialStatus?: string;
  onComplete?: (data: Record<string, any>) => void;
}

const AGENTS = [
  { 
    id: "intake", 
    label: "Intake Agent", 
    description: "Parsing patient data", 
    icon: ClipboardList,
    estimatedSeconds: 8
  },
  { 
    id: "symptom", 
    label: "Symptom Agent", 
    description: "Analyzing symptoms + RAG", 
    icon: Activity,
    estimatedSeconds: 12
  },
  { 
    id: "diagnosis", 
    label: "Diagnosis Agent", 
    description: "Generating differential DDx", 
    icon: Search,
    estimatedSeconds: 20
  },
  { 
    id: "drug_check", 
    label: "Drug Agent", 
    description: "Checking interactions", 
    icon: Pill,
    estimatedSeconds: 8
  },
  { 
    id: "report", 
    label: "Report Agent", 
    description: "Compiling clinical report", 
    icon: FileText,
    estimatedSeconds: 15
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
    reconnect
  } = useAgentStream(sessionId, initialStatus);

  const completedTriggeredRef = useRef(false);

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
      // Completed intake, symptom, report (3 out of 3 active agents in this path)
      return (completedAgents.length / 3) * 100;
    }

    return (completedAgents.length / AGENTS.length) * 100;
  };

  const getAgentKeyFinding = (id: string, data: Record<string, any>) => {
    switch (id) {
      case 'intake':
        return data.intake_confidence !== undefined 
          ? `Confidence: ${Math.round(data.intake_confidence * 100)}%` 
          : 'Completed';
      case 'symptom':
        return data.symptom_severity 
          ? `Severity: ${data.symptom_severity}` 
          : 'Completed';
      case 'diagnosis':
        return data.ddx_count !== undefined 
          ? `${data.ddx_count} DDx found` 
          : 'Completed';
      case 'drug_check':
        return data.interactions_found !== undefined 
          ? `${data.interactions_found} interactions` 
          : 'Completed';
      case 'report':
        return data.urgency_level 
          ? `Urgency: ${data.urgency_level}` 
          : 'Completed';
      default:
        return 'Completed';
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 p-6 rounded-2xl bg-surface border border-border">
      
      {/* Header and Live Status */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-sans font-bold text-sm text-text-primary tracking-wide uppercase">
            MediGuard AI — Live Analysis
          </h3>
          <p className="text-xs text-text-secondary">
            Streamed in real-time via clinical WebSocket telemetry.
          </p>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live</span>
            </div>
          ) : (
            <button 
              onClick={reconnect}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-text-secondary hover:bg-slate-700 hover:text-text-primary transition-all"
            >
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
              <span>Connecting...</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
        <div 
          className={`h-full transition-all duration-700 ease-out ${
            isPipelineComplete ? 'bg-emerald-500' : 'bg-teal-500 shadow-[0_0_10px_rgba(13,148,136,0.5)]'
          }`}
          style={{ width: `${getProgressPercent()}%` }}
        />
      </div>

      {/* Nodes Container */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 py-4 relative">
        {AGENTS.map((agent, idx) => {
          const isCompleted = completedAgents.includes(agent.id);
          const isFailed = failedAgents.includes(agent.id);
          const isRunning = currentAgent === agent.id;
          
          // Determine skipped state (if pipeline completed but this agent never ran/completed)
          const isSkipped = isPipelineComplete && !isCompleted && !isFailed;
          const isWaiting = !isCompleted && !isFailed && !isRunning && !isSkipped;
          
          // Find the completed event data for this agent
          const completeEvent = events.find(
            (e) => e.agent_name === agent.id && e.event_type === 'agent_completed'
          );
          const keyFinding = completeEvent ? getAgentKeyFinding(agent.id, completeEvent.data) : null;

          const AgentIcon = agent.icon;

          // Connection line to next node
          const showLine = idx < AGENTS.length - 1;
          const nextAgent = showLine ? AGENTS[idx + 1] : null;
          const isNextCompleted = nextAgent ? completedAgents.includes(nextAgent.id) : false;
          const isLineCompleted = nextAgent ? (isCompleted && (isNextCompleted || (isPipelineComplete && completedAgents.includes(agent.id)))) : false;
          const isLineActive = nextAgent ? (isCompleted && currentAgent === nextAgent.id) : false;

          return (
            <React.Fragment key={agent.id}>
              {/* Agent Node */}
              <div 
                className={`flex-1 flex flex-row lg:flex-col items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                  isRunning 
                    ? 'border-teal-500/80 bg-teal-500/5 shadow-[0_0_15px_rgba(13,148,136,0.25)] scale-[1.03]' 
                    : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : isFailed
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : isSkipped
                    ? 'border-slate-800 bg-slate-900/40 opacity-50 border-dashed'
                    : 'border-border bg-surface-raised opacity-60'
                }`}
              >
                {/* Icon Wrapper */}
                <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center relative flex-shrink-0 transition-colors ${
                  isRunning
                    ? 'bg-teal-500 text-text-primary border-teal-400'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500'
                    : isFailed
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500'
                    : isSkipped
                    ? 'bg-slate-800 text-text-muted border-slate-700'
                    : 'bg-background text-text-muted border-border'
                }`}>
                  {isRunning ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : isFailed ? (
                    <XCircle className="h-6 w-6 animate-pulse" />
                  ) : (
                    <AgentIcon className="h-5 w-5" />
                  )}
                </div>

                {/* Info Text */}
                <div className="flex flex-col text-left lg:text-center gap-0.5">
                  <span className={`text-xs font-bold font-sans tracking-wide ${
                    isRunning ? 'text-teal-400' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-text-primary'
                  }`}>
                    {agent.label}
                  </span>
                  
                  {/* Status Note */}
                  <span className="text-[10px] text-text-secondary">
                    {isRunning ? (
                      <CountdownTimer seconds={agent.estimatedSeconds} />
                    ) : isCompleted ? (
                      <span className="font-semibold text-emerald-500 font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {keyFinding}
                      </span>
                    ) : isFailed ? (
                      <span className="text-rose-400 font-semibold">Failed</span>
                    ) : isSkipped ? (
                      <span className="italic text-text-muted">Skipped</span>
                    ) : (
                      "Waiting..."
                    )}
                  </span>
                </div>
              </div>

              {/* Desktop Connecting Line */}
              {showLine && (
                <div className="hidden lg:flex flex-1 items-center justify-center">
                  <div className={`h-0.5 w-full rounded-full transition-colors duration-500 ${
                    isLineCompleted 
                      ? 'bg-emerald-500' 
                      : isLineActive 
                      ? 'border-t-2 border-dashed border-teal-500 animate-pulse' 
                      : 'bg-slate-800'
                  }`} />
                </div>
              )}
            </React.Fragment>
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
                Clinical Analysis Complete ({pipelineData.total_duration_seconds}s)
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

    </div>
  );
}
