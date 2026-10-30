'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Split, 
  GitMerge, 
  Search, 
  Pill, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  ArrowDown, 
  Layers, 
  Info 
} from 'lucide-react';
import { SimulationRoute } from './types';

interface ParallelExecutionViewerProps {
  currentRoute: SimulationRoute;
  currentStepIndex: number; // to show dynamic states
}

export default function ParallelExecutionViewer({
  currentRoute,
  currentStepIndex
}: ParallelExecutionViewerProps) {
  const isCritical = currentRoute === 'critical';

  // In standard route:
  // step 7 = diag started, step 8 = drug started, step 9 = drug completed, step 10 = diag completed, step 11 = parallel sync
  const diagStarted = !isCritical && currentStepIndex >= 6;
  const drugStarted = !isCritical && currentStepIndex >= 7;
  const drugCompleted = !isCritical && currentStepIndex >= 8;
  const diagCompleted = !isCritical && currentStepIndex >= 9;
  const synchronized = !isCritical && currentStepIndex >= 10;

  return (
    <div className="w-full flex flex-col gap-5 bg-surface border border-border/80 rounded-2xl p-5 shadow-xl text-left">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/70 gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Split className="h-4 w-4 text-purple-400" />
            <h3 className="font-sans font-bold text-base text-text-primary">
              Parallel Execution & Concurrency Architecture
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
              asyncio.gather
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Concurrency model inside the registered <code className="font-mono text-primary">&quot;diagnosis&quot;</code> node: concurrent dispatch, non-blocking I/O, and state synchronization.
          </p>
        </div>

        <div className="text-[11px] font-mono text-text-muted bg-slate-900 px-3 py-1.5 rounded-xl border border-border/60 self-start sm:self-auto">
          Node: <strong className="text-purple-300">parallel_clinical_analysis</strong>
        </div>
      </div>

      {/* ── Verified Concurrency Note ── */}
      <div className="p-3.5 rounded-xl bg-[#090e1f] border border-border/70 flex items-start gap-3 text-xs">
        <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="font-bold text-text-primary">
            Source-Verified Concurrency Model:
          </span>
          <p className="text-text-secondary leading-relaxed">
            In <code className="font-mono text-slate-300">backend/app/agents/orchestrator.py</code>, line 96:
            <code className="font-mono text-primary block my-1">
              diag_task = asyncio.create_task(self.diagnosis_agent.run(diag_input))<br/>
              drug_task = asyncio.create_task(self.drug_agent.run(drug_input))<br/>
              diag_result, drug_result = await asyncio.gather(diag_task, drug_task)
            </code>
            Both agents are dispatched concurrently on Python&apos;s asynchronous event loop. They do not block each other, reducing pipeline latency by an estimated 35-40%.
          </p>
        </div>
      </div>

      {/* ── Critical Route Bypass Banner ── */}
      {isCritical && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">
              Parallel Execution Node Bypassed in Emergency Route
            </span>
            <p className="text-amber-200/90 leading-relaxed text-[11px]">
              Because the Symptom Agent detected an acute life-threat (urgency == &quot;critical&quot;), LangGraph followed the emergency conditional edge directly to ReportAgent. Neither DiagnosisAgent nor DrugAgent were dispatched.
            </p>
          </div>
        </div>
      )}

      {/* ── Visual Fork / Dual-Swimlane Container ── */}
      <div className={`relative flex flex-col gap-4 p-5 rounded-2xl bg-[#070b16] border ${
        isCritical ? 'border-dashed border-border/50 opacity-60' : 'border-border/80'
      }`}>
        
        {/* Fork Dispatch Marker */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold">
            <Split className="h-3.5 w-3.5" />
            <span>Fork Point: asyncio.create_task Dispatch</span>
          </div>
          <ArrowDown className="h-4 w-4 text-purple-400/80 my-1 animate-bounce" />
        </div>

        {/* Side-by-Side Swimlanes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Branch 1: Diagnosis Agent Task */}
          <div className={`flex flex-col gap-3 p-4 rounded-xl border transition-all text-xs ${
            diagCompleted 
              ? 'bg-indigo-950/20 border-indigo-500/50' 
              : diagStarted 
              ? 'bg-indigo-950/10 border-indigo-500/30 ring-1 ring-indigo-500/20' 
              : 'bg-surface/50 border-border/60'
          }`}>
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-400" />
                <span className="font-bold text-text-primary">Branch 1: Diagnosis Agent</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                diagCompleted
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : diagStarted
                  ? 'bg-sky-500/15 text-sky-400 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {isCritical ? 'BYPASSED' : diagCompleted ? 'COMPLETED' : diagStarted ? 'ACTIVE' : 'WAITING'}
              </span>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              Executes second-pass PubMed vector RAG against Pinecone, reasons across clinical guidelines, and generates ranked differential hypotheses with ICD-10 codes.
            </p>

            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-black/40 font-mono text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-text-muted">Estimated Duration:</span>
                <span className="text-indigo-300">~20s (Illustrative: ~3.5s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Concurrency Isolation:</span>
                <span className="text-emerald-400">Clone state dict (no mutation hazard)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Primary Output:</span>
                <span className="text-primary truncate max-w-[150px]">differential_diagnosis (DDx)</span>
              </div>
            </div>
          </div>

          {/* Branch 2: Drug Safety Agent Task */}
          <div className={`flex flex-col gap-3 p-4 rounded-xl border transition-all text-xs ${
            drugCompleted 
              ? 'bg-emerald-950/20 border-emerald-500/50' 
              : drugStarted 
              ? 'bg-emerald-950/10 border-emerald-500/30 ring-1 ring-emerald-500/20' 
              : 'bg-surface/50 border-border/60'
          }`}>
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-text-primary">Branch 2: Drug Agent</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                drugCompleted
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : drugStarted
                  ? 'bg-sky-500/15 text-sky-400 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {isCritical ? 'BYPASSED' : drugCompleted ? 'COMPLETED' : drugStarted ? 'ACTIVE' : 'WAITING'}
              </span>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              Screens active patient prescriptions against OpenFDA NDC interaction databases and checks allergies for cross-reactivity and black-box warnings.
            </p>

            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-black/40 font-mono text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-text-muted">Estimated Duration:</span>
                <span className="text-emerald-300">~8s (Illustrative: ~2.8s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Early Exit Safe:</span>
                <span className="text-emerald-400">Skips LLM if 0 medications</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Primary Output:</span>
                <span className="text-emerald-300 truncate max-w-[150px]">drug_interactions, safe flag</span>
              </div>
            </div>
          </div>

        </div>

        {/* Join / Synchronization Merge Marker */}
        <div className="flex flex-col items-center justify-center text-center mt-2">
          <ArrowDown className="h-4 w-4 text-primary my-1" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${
            synchronized
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <GitMerge className="h-3.5 w-3.5" />
            <span>Join Point: await asyncio.gather(diag_task, drug_task)</span>
          </div>
        </div>

        {/* Merge Explanation Card */}
        <div className="p-3.5 rounded-xl bg-surface/80 border border-border/70 flex flex-col gap-1.5 text-xs text-left">
          <span className="font-bold text-text-primary text-[11px] uppercase tracking-wider">
            State Assembly & Merge Protocol:
          </span>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Once both tasks resolve, the orchestrator merges outputs into <code className="font-mono text-primary">merged_state</code>:
            combining <code className="font-mono text-slate-300">differential_diagnosis</code>, <code className="font-mono text-slate-300">primary_diagnosis</code>, and RAG context from Branch 1 with <code className="font-mono text-slate-300">drug_interactions</code> and <code className="font-mono text-slate-300">medication_safe</code> from Branch 2.
            Both <code className="font-mono text-purple-300">&quot;diagnosis&quot;</code> and <code className="font-mono text-purple-300">&quot;drug_check&quot;</code> are appended to <code className="font-mono text-slate-300">completed_agents</code>, and execution proceeds to <code className="font-mono text-teal-300">&quot;report&quot;</code>.
          </p>
        </div>

      </div>

    </div>
  );
}
