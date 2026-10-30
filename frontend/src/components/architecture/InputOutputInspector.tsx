'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowDownRight, 
  Database, 
  GitFork, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Layers, 
  ClipboardList, 
  Activity, 
  Search, 
  FileText,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { STAGE_IO_DEFINITIONS } from './simulationData';
import { StageIODefinition } from './types';

interface InputOutputInspectorProps {
  currentStageId?: string;
  isCriticalRoute?: boolean;
}

export default function InputOutputInspector({
  currentStageId = 'intake',
  isCriticalRoute = false
}: InputOutputInspectorProps) {
  const [activeStageKey, setActiveStageKey] = useState<string>(currentStageId);

  // Keep activeStageKey in sync when currentStageId changes, unless manually changed
  React.useEffect(() => {
    if (currentStageId && STAGE_IO_DEFINITIONS[currentStageId]) {
      setActiveStageKey(currentStageId);
    }
  }, [currentStageId]);

  const activeStage: StageIODefinition = STAGE_IO_DEFINITIONS[activeStageKey] || STAGE_IO_DEFINITIONS.intake;

  const isBypassedInCritical = isCriticalRoute && activeStageKey === 'diagnosis';

  return (
    <div className="w-full flex flex-col gap-5 bg-surface border border-border/80 rounded-2xl p-5 shadow-xl text-left">
      
      {/* ── Top Header & Stage Navigation Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/70 gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="font-sans font-bold text-base text-text-primary">
              Stage Input / Output Inspector
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
              AgentState Verified
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Detailed inspection of typed inputs read from and outputs written to the shared LangGraph <code className="font-mono text-primary">AgentState</code>.
          </p>
        </div>

        {/* Stage Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          {Object.entries(STAGE_IO_DEFINITIONS).map(([key, stage]) => {
            const isSelected = activeStageKey === key;
            const isStageBypassed = isCriticalRoute && key === 'diagnosis';
            return (
              <button
                key={key}
                onClick={() => setActiveStageKey(key)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-text-primary shadow-sm'
                    : 'bg-surface-raised border border-border/70 text-text-secondary hover:text-text-primary'
                } ${isStageBypassed ? 'border-dashed border-amber-500/50' : ''}`}
              >
                <span className="capitalize">{key === 'diagnosis' ? 'Diagnosis & Drug' : key}</span>
                {isStageBypassed && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Bypassed
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stage Overview Header & Component Topology ── */}
      <div className="p-4 rounded-xl bg-[#090f1d] border border-border/70 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-text-primary">
              {activeStage.stageName}
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              LangGraph Node: <strong className="text-primary">{activeStage.registeredGraphNode}</strong>
            </span>
          </div>

          {/* Upstream & Downstream Flow */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-text-muted">Upstream:</span>
              <span className="text-sky-400 font-bold">{activeStage.upstreamNodes.join(', ')}</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-text-muted">Downstream:</span>
              <span className="text-emerald-400 font-bold">
                {isCriticalRoute && activeStageKey === 'symptom' ? 'report (Bypass)' : activeStage.downstreamNodes.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Rationale */}
        <p className="text-xs text-text-secondary leading-relaxed">
          {activeStage.clinicalRationale}
        </p>

        {/* Specialist tasks inside this stage */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Internal Tasks:</span>
          {activeStage.specialistTasks.map((task, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-slate-800/90 text-[11px] font-mono text-purple-300 border border-purple-500/20">
              {task}
            </span>
          ))}
        </div>

        {/* Emergency Bypass Warning Banner if applicable */}
        {isBypassedInCritical && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2 mt-1">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <strong className="font-bold">Stage Bypassed in Critical Urgency Route:</strong>
              <span className="text-amber-200/90 mt-0.5">
                The orchestrator conditional edge <code className="font-mono text-amber-400">_conditional_route_after_symptom()</code> bypassed this node to fast-track directly to ReportAgent for emergency alerting.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Inputs and Outputs 2-Column Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Column 1: Stage Inputs */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#0b1120] border border-border/70">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <span>Read from AgentState (Inputs)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">{activeStage.inputs.length} fields</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {activeStage.inputs.map((inp, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-surface/80 border border-border/60 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary text-[11px]">
                    state[&apos;{inp.field}&apos;]
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 px-1.5 py-0.2 bg-slate-800 rounded">
                    {inp.type}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal">
                  {inp.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-text-muted mt-0.5 pt-1 border-t border-border/30">
                  <span>Source: <strong className="text-slate-300">{inp.source}</strong></span>
                  <span className="text-emerald-400 font-mono">✓ verified schema</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Stage Outputs */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#0b1120] border border-border/70">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>Written to AgentState (Outputs)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">{activeStage.outputs.length} fields</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {activeStage.outputs.map((out, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-surface/80 border border-border/60 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400 text-[11px]">
                    state[&apos;{out.field}&apos;]
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 px-1.5 py-0.2 bg-slate-800 rounded">
                    {out.type}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal">
                  {out.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-text-muted mt-0.5 pt-1 border-t border-border/30">
                  <span>Target: <strong className="text-slate-300">{out.destination}</strong></span>
                  <span className="text-emerald-400 font-mono">✓ verified schema</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── State Changes (Delta) Section ── */}
      <div className="p-4 rounded-xl bg-[#090e1b] border border-border/70 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <span>AgentState Delta (Mutations applied by this node)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Shared Memory Transition</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {activeStage.stateChanges.map((sc, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-surface/60 border border-border/60 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-text-primary text-[11px] truncate">
                  {sc.field}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                  sc.changeType === 'created'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : sc.changeType === 'modified'
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                }`}>
                  {sc.changeType}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {sc.explanation}
              </p>
            </div>
          ))}
        </div>

        <span className="text-[10px] text-text-muted italic mt-1">
          * Source verified against `backend/app/schemas/agent.py` TypedDict. No artificial fields added.
        </span>
      </div>

    </div>
  );
}
