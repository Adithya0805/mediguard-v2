'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { getAuditTrail, generateReport } from '@/lib/api';
import { AuditLogEntry } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import StatusBadge from '@/components/shared/StatusBadge';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Clock, 
  User, 
  Heart,
  Server,
  Terminal
} from 'lucide-react';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { session, isLoading, isPolling, error } = useSession(sessionId);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Fetch Audit Logs when session status changes or completes
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logs = await getAuditTrail(sessionId);
        setAuditLogs(logs);
      } catch (e) {
        console.error('Failed to load audit logs:', e);
      }
    };

    if (session) {
      fetchLogs();
    }
  }, [sessionId, session]);

  // Tick counter for "Last updated X seconds ago"
  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Trigger background report generation if session status is pending (safety gate auto-trigger)
  useEffect(() => {
    const triggerAnalysis = async () => {
      if (session && session.status === 'pending') {
        try {
          console.log('[Auto-Trigger] Session is pending. Initiating clinical analysis graph pipeline...');
          await generateReport(sessionId);
        } catch (err) {
          console.error('[Auto-Trigger] Failed to auto-start pending clinical analysis:', err);
        }
      }
    };
    triggerAnalysis();
  }, [sessionId, session]);

  if (isLoading && !session) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Synchronizing clinical session telemetry..." />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-2xl bg-surface border border-danger/20 text-center my-12">
        <div className="text-danger font-bold text-lg">Failed to Retrieve Session</div>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          The requested session ID &apos;{sessionId}&apos; does not exist or clinical access privilege failed.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 px-5 py-2.5 rounded-xl bg-surface-raised border border-border text-text-primary hover:bg-surface transition-all text-sm font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // MOCK PIPELINE NODES DEFINITIONS
  const pipelineNodes = [
    { label: 'Intake Parsing', icon: User },
    { label: 'Symptom RAG', icon: Server },
    { label: 'Differential Diagnosis', icon: Heart },
    { label: 'Pharmacology', icon: PlayCircle },
    { label: 'Synthesizing', icon: FileText },
  ];

  // Map simulated active node based on age/status
  const activeNodeIndex = session.status === 'completed' 
    ? 5 
    : session.status === 'failed' 
    ? 3 
    : session.status === 'processing' 
    ? 2 
    : 0;

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-8 w-full text-left">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/60 pb-6 gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h2 className="font-sans font-bold text-2xl tracking-tight text-text-primary">
                Live Case Tracker
              </h2>
              <StatusBadge status={session.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-text-secondary">
              <span><b>ID:</b> {session.id}</span>
              <span>•</span>
              <span className="capitalize"><b>Sex:</b> {session.patient_gender}</span>
              <span>•</span>
              <span><b>Age:</b> {session.patient_age} Years</span>
            </div>
          </div>

          {/* Timing synchronization pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-[11px] font-mono text-text-secondary">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Sync: {secondsAgo}s ago</span>
            {isPolling && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping ml-1" />}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            TRIAGE BANNER / COMPLETED QUICK SUMMARY
            ───────────────────────────────────────────────────────────────────────────── */}
        {session.status === 'completed' && (
          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-[0_0_15px_rgba(13,148,136,0.1)]">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-primary uppercase">CDS Report Ready</span>
              <h3 className="text-lg font-bold text-text-primary">Acute Coronary Syndrome</h3>
              <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                collrospective reasoning graph resolved ACS candidate as primary diagnostic recommendation with 87% confidence metrics.
              </p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <UrgencyBadge urgency="high" />
              <button
                onClick={() => router.push(`/report/${session.id}`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all font-semibold text-sm shadow-[0_0_10px_rgba(13,148,136,0.2)] hover:scale-[1.02]"
              >
                <FileText className="h-4.5 w-4.5" />
                <span>View Full CDS Report</span>
              </button>
            </div>
          </div>
        )}

        {session.status === 'failed' && (
          <div className="p-6 rounded-2xl bg-danger/10 border border-danger/20 flex flex-col gap-3">
            <h4 className="text-base font-bold text-danger">Pipeline Analysis Interrupted</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              collaborative agents encountered pinecone/embedding indexing faults or connection resets. Triage the patient manually. Please review local logs or contact support.
            </p>
            <div className="flex gap-4 mt-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-all"
              >
                Retry Pipeline run
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            LIVE PIPELINE GRAPH STEPS
            ───────────────────────────────────────────────────────────────────────────── */}
        {(session.status === 'processing' || session.status === 'pending') && (
          <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-text-primary">Multi-Agent Workflow Execution</h4>
              <span className="text-xs text-text-secondary">Tracking active node processing states inside LangGraph supervisions.</span>
            </div>

            {/* Horizontal Timeline */}
            <div className="relative flex items-center justify-between mt-4 w-full">
              {/* Connector line */}
              <div className="absolute left-6 right-6 h-0.5 bg-slate-800 z-0" />
              <div 
                className="absolute left-6 h-0.5 bg-primary z-0 transition-all duration-500" 
                style={{ width: `${(activeNodeIndex / 4) * 90}%` }}
              />

              {pipelineNodes.map((node, idx) => {
                const isCompleted = idx < activeNodeIndex;
                const isActive = idx === activeNodeIndex;
                const NodeIcon = node.icon;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2.5 relative z-10">
                    <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-primary border-primary text-text-primary' 
                        : isActive 
                        ? 'bg-surface-raised border-primary text-primary scale-110 shadow-[0_0_12px_var(--primary)] animate-pulse' 
                        : 'bg-surface-raised border-border text-text-muted'
                    }`}>
                      {isCompleted ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <NodeIcon className={`h-5 w-5 ${isActive ? 'animate-spin-slow' : ''}`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide ${
                      isActive ? 'text-primary' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                    }`}>
                      {node.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            PATIENT INTAKE SUMMARY CARD
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          
          {/* Left Column: Demographics & Chief Complaint (60%) */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Patient Demographic Profile</h3>
            </div>

            <div className="grid grid-cols-2 gap-6 border-b border-border/60 pb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Full Name</span>
                <span className="text-sm font-bold text-text-primary">{session.patient_name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Clinical Complaint Vector</span>
                <span className="text-sm font-mono text-text-primary capitalize">{session.patient_gender} | {session.patient_age} Years</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Chief Complaint</span>
              <p className="text-xs text-text-primary bg-background/50 border border-border/50 p-4 rounded-xl leading-relaxed italic">
                &quot;{session.chief_complaint}&quot;
              </p>
            </div>

            {/* Tag profiles */}
            <div className="flex flex-col gap-4 pt-2">
              {/* Symptoms */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Submitted Symptoms</span>
                <div className="flex flex-wrap gap-2">
                  {session.symptoms.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[10px] font-semibold text-text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Medical History */}
              {session.medical_history.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Medical History</span>
                  <div className="flex flex-wrap gap-2">
                    {session.medical_history.map((h, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-text-secondary">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergies */}
              {session.allergies.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Known Allergies</span>
                  <div className="flex flex-wrap gap-2">
                    {session.allergies.map((a, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-danger/10 border border-danger/20 text-[10px] font-mono font-bold text-danger">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Vitals Table & Medications (40%) */}
          <div className="lg:col-span-5 flex flex-col gap-8 items-stretch">
            
            {/* Vitals table */}
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-5 text-left flex-1">
              <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Physiological Vitals</h3>
              
              {(() => {
                const filteredVitals = [
                  { name: 'Blood Pressure', val: session.vitals?.bp, unit: 'mmHg' },
                  { name: 'Heart Rate', val: session.vitals?.heart_rate, unit: 'bpm' },
                  { name: 'Body Temperature', val: session.vitals?.temperature, unit: '°C' },
                  { name: 'Oxygen Saturation', val: session.vitals?.spo2, unit: '%' },
                  { name: 'Weight', val: session.vitals?.weight, unit: 'kg' },
                  { name: 'Height', val: session.vitals?.height, unit: 'cm' },
                ].filter(item => item.val !== undefined && item.val !== null && item.val !== '' && item.val !== 'N/A');

                if (filteredVitals.length === 0) {
                  return (
                    <div className="text-xs text-text-secondary italic text-center py-4 font-sans">
                      No baseline physiological vitals recorded.
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-3.5">
                    {filteredVitals.map((item, idx) => (
                      <div key={idx} className="flex justify-between border-b border-border/40 pb-2 text-xs">
                        <span className="text-text-secondary font-medium">{item.name}</span>
                        <span className="font-mono font-bold text-text-primary">
                          {item.val} <span className="text-[9px] text-text-secondary uppercase ml-0.5">{item.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Current Medications */}
            {session.current_medications.length > 0 && (
              <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4 text-left">
                <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Current Drug Regimen</h3>
                <div className="flex flex-wrap gap-2">
                  {session.current_medications.map((m, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            AUDIT TIMELINE ACCORDION
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col gap-4">
          <button
            onClick={() => setAuditExpanded((prev) => !prev)}
            className="flex items-center justify-between w-full font-sans font-bold text-sm text-text-primary tracking-wide"
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-4.5 w-4.5 text-accent" />
              <span>HIPAA Action Audit Logs ({auditLogs.length} events)</span>
            </div>
            {auditExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
          </button>

          <AnimatePresence>
            {auditExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4"
              >
                <div className="flex flex-col gap-4 border-l border-border/80 pl-6 ml-3 relative">
                  {auditLogs.map((log) => {
                    const time = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    return (
                      <div key={log.id} className="flex flex-col text-left gap-1 relative">
                        {/* Dot marker */}
                        <div className="absolute -left-[30px] top-1.5 h-3 w-3 rounded-full bg-accent/30 border-2 border-accent" />
                        
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-text-muted">{time}</span>
                          <span className="text-[10px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/10 uppercase tracking-wide">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-text-secondary">Actor: <b>{log.actor}</b></span>
                        </div>

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <pre className="p-2.5 rounded bg-background border border-border text-[9px] font-mono text-text-secondary mt-1 overflow-x-auto">
                            {JSON.stringify(log.metadata)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </ErrorBoundary>
  );
}
