'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Layers, 
  ShieldCheck, 
  Info, 
  FileCode,
  Clock,
  Split,
  Workflow
} from 'lucide-react';
import { STANDARD_ROUTING_DIAGNOSTICS, CRITICAL_ROUTING_DIAGNOSTICS } from './simulationData';
import { SimulationRoute, RoutingDiagnosticsData } from './types';

interface RoutingDiagnosticsProps {
  currentRoute: SimulationRoute;
  onChangeRoute: (route: SimulationRoute) => void;
}

export default function RoutingDiagnostics({
  currentRoute,
  onChangeRoute
}: RoutingDiagnosticsProps) {
  const [selectedRouteTab, setSelectedRouteTab] = useState<SimulationRoute>(currentRoute);

  React.useEffect(() => {
    setSelectedRouteTab(currentRoute);
  }, [currentRoute]);

  const activeDiagnostics: RoutingDiagnosticsData = 
    selectedRouteTab === 'critical' ? CRITICAL_ROUTING_DIAGNOSTICS : STANDARD_ROUTING_DIAGNOSTICS;

  return (
    <div className="w-full flex flex-col gap-5 bg-surface border border-border/80 rounded-2xl p-5 shadow-xl text-left">
      
      {/* ── Top Header & Route Selection Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/70 gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            <h3 className="font-sans font-bold text-base text-text-primary">
              Routing Diagnostics & Conditional Graph Logic
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
              LangGraph Engine
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Diagnostic breakdown of LangGraph conditional routing edges, emergency bypass triggers, and node vs task architectural mapping.
          </p>
        </div>

        {/* Route Selector Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/90 p-1 rounded-xl border border-border">
          <button
            onClick={() => {
              setSelectedRouteTab('standard');
              onChangeRoute('standard');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedRouteTab === 'standard'
                ? 'bg-primary text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Standard Route</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-300">
              Full DDx
            </span>
          </button>
          
          <button
            onClick={() => {
              setSelectedRouteTab('critical');
              onChangeRoute('critical');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedRouteTab === 'critical'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-rose-400'
            }`}
          >
            <span>🚨 Critical Route</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-rose-200">
              Bypass Active
            </span>
          </button>
        </div>
      </div>

      {/* ── Active Route Diagnostic Banner ── */}
      <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
        selectedRouteTab === 'critical'
          ? 'bg-rose-950/15 border-rose-500/40 text-rose-200'
          : 'bg-[#091122] border-primary/30 text-teal-200'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                selectedRouteTab === 'critical' ? 'bg-rose-500 animate-ping' : 'bg-primary'
              }`} />
              <h4 className="font-bold text-sm text-text-primary">
                {activeDiagnostics.routeName}
              </h4>
            </div>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {activeDiagnostics.routeSummary}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Trigger Acuity</span>
            <span className="font-mono text-xs font-bold text-text-primary">
              {activeDiagnostics.triggerCondition}
            </span>
          </div>
        </div>

        {/* Function Evaluation Box */}
        <div className="p-3 rounded-lg bg-surface/80 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-bold">Conditional Edge:</span>
            <code className="font-mono text-primary bg-slate-900 px-2 py-0.5 rounded border border-border/40">
              {activeDiagnostics.conditionalEvaluation.functionName}
            </code>
          </div>
          
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-text-muted">{activeDiagnostics.conditionalEvaluation.evaluatedField} =</span>
            <span className="text-amber-400 font-bold">{activeDiagnostics.conditionalEvaluation.evaluatedValue}</span>
            <ArrowRight className="h-3 w-3 text-text-muted" />
            <span className="text-emerald-400 font-bold">&quot;{activeDiagnostics.conditionalEvaluation.targetNode}&quot;</span>
          </div>
        </div>
      </div>

      {/* ── Architectural Distinction: Graph Node vs Specialist Tasks ── */}
      <div className="p-4 rounded-xl bg-[#090f1e] border border-border/70 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <h4 className="font-bold text-sm text-text-primary">
            Architectural Distinction: Registered Graph Node vs Internal Specialist Tasks
          </h4>
        </div>
        
        <p className="text-xs text-text-secondary leading-relaxed">
          MediGuard V2 preserves strict segregation between what LangGraph orchestrates as registered state-machine nodes and the internal concurrent coroutines dispatched by those nodes:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Card A: Registered LangGraph Node */}
          <div className="p-3 rounded-lg bg-surface/60 border border-border/60 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              1. Registered LangGraph Node: &quot;diagnosis&quot;
            </span>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              In <code className="font-mono text-primary">MediGuardOrchestrator._build_graph()</code>, only 4 nodes are registered with LangGraph: 
              <code className="font-mono text-slate-300"> intake</code>, 
              <code className="font-mono text-slate-300"> symptom</code>, 
              <code className="font-mono text-slate-300"> diagnosis</code>, and 
              <code className="font-mono text-slate-300"> report</code>.
              The registered <code className="font-mono text-purple-300">&quot;diagnosis&quot;</code> node is a coroutine wrapper named <code className="font-mono text-purple-300">parallel_clinical_analysis</code>.
            </p>
          </div>

          {/* Card B: Internal Specialist Tasks */}
          <div className="p-3 rounded-lg bg-surface/60 border border-border/60 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              2. Internal Specialist Tasks: DiagnosisAgent & DrugAgent
            </span>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Inside <code className="font-mono text-purple-300">parallel_clinical_analysis</code>, the orchestrator executes:
              <code className="font-mono text-slate-300 block my-1">diag_task = asyncio.create_task(self.diagnosis_agent.run(state))</code>
              <code className="font-mono text-slate-300 block mb-1">drug_task = asyncio.create_task(self.drug_agent.run(state))</code>
              <code className="font-mono text-slate-300 block">await asyncio.gather(diag_task, drug_task)</code>
              These run concurrently in Python&apos;s event loop. When emergency bypass triggers, LangGraph bypasses the <em>entire wrapper node</em>, so neither task is ever created.
            </p>
          </div>
        </div>
      </div>

      {/* ── Why Bypass Occurs (Emergency Rationale) ── */}
      {selectedRouteTab === 'critical' && activeDiagnostics.whyBypassOccurred && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="h-4 w-4" />
            <span>Clinical & Engineering Rationale: Why the Critical Route Bypasses Diagnosis</span>
          </div>
          <p className="text-slate-200 leading-relaxed text-[11px]">
            {activeDiagnostics.whyBypassOccurred}
          </p>
          <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/20 text-amber-200/90 text-[10px] font-mono leading-relaxed mt-1">
            <strong>Orchestrator Source Contract:</strong><br/>
            <code>
              def _conditional_route_after_symptom(state: AgentState) -&gt; str:<br/>
              &nbsp;&nbsp;if state.get(&quot;urgency_level&quot;) == &quot;critical&quot;:<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;logger.warning(&quot;EMERGENCY GATE TRIGGERED — bypassing full DDx pipeline&quot;)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;return &quot;report&quot; # Bypasses diagnosis node completely<br/>
              &nbsp;&nbsp;return &quot;diagnosis&quot;
            </code>
          </div>
        </div>
      )}

      {/* ── Step-by-Step Route Execution Sequence ── */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-text-primary">
          Route Execution Step Sequence
        </span>

        <div className="flex flex-col gap-2">
          {activeDiagnostics.steps.map((step) => {
            const isBypassed = step.status === 'bypassed';
            return (
              <div
                key={step.stepNumber}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  isBypassed
                    ? 'bg-amber-950/10 border-dashed border-amber-500/40 opacity-75'
                    : 'bg-surface/80 border-border/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                    isBypassed
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-primary/20 text-primary border border-primary/30'
                  }`}>
                    {step.stepNumber}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-text-primary text-xs">
                        {step.nodeName}
                      </span>
                      {step.isRegisteredGraphNode && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Registered Node
                        </span>
                      )}
                      {step.isParallel && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20">
                          Parallel Wrapper
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 flex flex-col items-end">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    isBypassed
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {step.status}
                  </span>
                  <span className="text-[9px] text-text-muted mt-1 max-w-[160px] truncate">
                    {step.clinicalPurpose}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
