'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  Layers, 
  Workflow, 
  Activity, 
  BrainCircuit, 
  GitBranch, 
  Server, 
  Database, 
  FileText, 
  Clock, 
  Lock, 
  AlertTriangle, 
  ExternalLink,
  Info,
  CheckCircle2,
  Cpu,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import PipelineExecutionSimulator from './PipelineExecutionSimulator';

export default function ArchitectureSimulator() {
  const [activeTopTab, setActiveTopTab] = useState<'timeline' | 'explorer' | 'routing'>('timeline');

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      
      {/* ── Mandatory Educational & Safety Disclaimer Banner ── */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col text-xs leading-relaxed">
            <span className="font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <span>Simulation & Architecture Diagnostics Only</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px]">
                Offline Sandbox
              </span>
            </span>
            <span className="text-amber-200/90 mt-0.5">
              This interactive explorer demonstrates MediGuard V2&apos;s LangGraph supervisor topology, parallel execution model, and emergency gate routing. 
              <strong> Zero real clinical agents are invoked, zero patient PHI is transmitted, and no clinical backend endpoints or WebSockets are connected.</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <Link
            href="/demo"
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all flex items-center gap-1"
          >
            <span>Live Demo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Page Header & Architecture Metrics ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-2 gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 border border-primary/20 text-primary uppercase">
              Phase 3 CDSS Explorer
            </span>
            <span className="text-xs text-text-muted">•</span>
            <span className="text-xs text-text-muted font-mono">LangGraph 0.2 + FastAPI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Architecture Simulator & Execution Diagnostics
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            Interactive telemetry inspector visualizing the multi-agent clinical state machine, parallel reasoning coroutines, and emergency critical-urgency safety bypass.
          </p>
        </div>

        {/* Quick Architecture Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-xs flex flex-col text-left">
            <span className="text-[10px] text-text-muted font-bold uppercase">Registered Nodes</span>
            <span className="font-mono font-bold text-primary">4 Nodes (LangGraph)</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-xs flex flex-col text-left">
            <span className="text-[10px] text-text-muted font-bold uppercase">Specialist Tasks</span>
            <span className="font-mono font-bold text-purple-400">5 Specialist Agents</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-xs flex flex-col text-left">
            <span className="text-[10px] text-text-muted font-bold uppercase">Concurrency</span>
            <span className="font-mono font-bold text-emerald-400">asyncio.gather</span>
          </div>
        </div>
      </div>

      {/* ── Main Top-Level Tab Switcher ── */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        <button
          onClick={() => setActiveTopTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTopTab === 'timeline'
              ? 'bg-primary text-text-primary shadow-md'
              : 'bg-surface border border-border/70 text-text-secondary hover:text-text-primary'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Execution Timeline & Diagnostics (Phase 3)</span>
        </button>

        <button
          onClick={() => setActiveTopTab('explorer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTopTab === 'explorer'
              ? 'bg-primary text-text-primary shadow-md'
              : 'bg-surface border border-border/70 text-text-secondary hover:text-text-primary'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Graph Topology Explorer (Phase 1)</span>
        </button>
      </div>

      {/* ── Top-Level Tab Content ── */}
      {activeTopTab === 'timeline' && (
        <motion.div
          key="timeline-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PipelineExecutionSimulator initialRoute="standard" />
        </motion.div>
      )}

      {activeTopTab === 'explorer' && (
        <motion.div
          key="explorer-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-6"
        >
          {/* Phase 1 Architecture Explorer Component View */}
          <div className="p-6 rounded-2xl bg-surface border border-border/80 shadow-2xl flex flex-col gap-6">
            <div className="flex flex-col">
              <h3 className="font-bold text-lg text-text-primary">
                MediGuard V2 Supervisor State Graph Topology
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Visualizing the compiled LangGraph directed state graph with conditional safety routing.
              </p>
            </div>

            {/* Mermaid Topology Diagram ASCII / Box representation */}
            <div className="p-6 rounded-xl bg-[#060a14] border border-border/70 flex flex-col items-center gap-4 text-xs font-mono">
              <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                START (Client POST /api/v1/patient/session)
              </div>
              <div className="h-4 w-0.5 bg-border" />
              <div className="px-5 py-2.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold">
                Node 1: intake (IntakeAgent.run)
              </div>
              <div className="h-4 w-0.5 bg-border" />
              <div className="px-5 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                Node 2: symptom (SymptomAgent.run + PubMed RAG Pass 1)
              </div>
              
              {/* Conditional Split visual */}
              <div className="flex items-center gap-8 my-2">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 mb-2">
                    urgency == &quot;critical&quot; (Emergency Bypass)
                  </span>
                  <div className="h-10 w-0.5 bg-rose-500/60" />
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-teal-300 font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/30 mb-2">
                    otherwise (Normal CDSS Route)
                  </span>
                  <div className="h-10 w-0.5 bg-primary/60" />
                </div>
              </div>

              {/* Parallel Box */}
              <div className="w-full max-w-xl p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 flex flex-col items-center gap-3">
                <span className="text-[11px] font-bold text-purple-300">
                  Node 3: diagnosis (parallel_clinical_analysis coroutine)
                </span>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="p-3 rounded-lg bg-surface/80 border border-indigo-500/30 text-center">
                    <span className="text-indigo-300 font-bold block">DiagnosisAgent.run</span>
                    <span className="text-[10px] text-text-muted mt-0.5 block">PubMed RAG + DDx</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/80 border border-emerald-500/30 text-center">
                    <span className="text-emerald-300 font-bold block">DrugAgent.run</span>
                    <span className="text-[10px] text-text-muted mt-0.5 block">OpenFDA NDC Screening</span>
                  </div>
                </div>
                <span className="text-[10px] text-purple-400/90 font-mono">
                  Synchronized at: await asyncio.gather(diag_task, drug_task)
                </span>
              </div>

              <div className="h-4 w-0.5 bg-border" />
              <div className="px-5 py-2.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold">
                Node 4: report (ReportAgent.run)
              </div>
              <div className="h-4 w-0.5 bg-border" />
              <div className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                END (Final State Persistence in Supabase)
              </div>
            </div>

            {/* Architectural Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#090e1b] border border-border/70 flex flex-col gap-2">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <Cpu className="h-4 w-4" />
                  <span>Supervisor Pattern</span>
                </span>
                <p className="text-text-secondary leading-relaxed text-[11px]">
                  MediGuard V2 uses LangGraph&apos;s supervisor architecture. A single typed state object (<code className="font-mono text-primary">AgentState</code>) flows through each node, with the supervisor verifying safety thresholds at every transition.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#090e1b] border border-border/70 flex flex-col gap-2">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4" />
                  <span>35-40% Latency Optimization</span>
                </span>
                <p className="text-text-secondary leading-relaxed text-[11px]">
                  Combining the two highest-latency operations (PubMed vector retrieval + differential reasoning, and OpenFDA pharmacovigilance screening) into parallel asyncio tasks cuts total run time from ~45s to ~28s.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#090e1b] border border-border/70 flex flex-col gap-2">
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Hardwired Safety Gate</span>
                </span>
                <p className="text-text-secondary leading-relaxed text-[11px]">
                  Life-threatening critical presentations bypass non-urgent deep diagnostic exploration, reaching report synthesis in ~5s instead of ~28s, allowing emergency physicians to act without computational latency.
                </p>
              </div>
            </div>

          </div>
        </motion.div>
      )}

    </div>
  );
}
