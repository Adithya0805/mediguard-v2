'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  GitBranch,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
} from 'lucide-react';

type Scenario = 'standard' | 'critical';

type PipelineStep = {
  id: string;
  component: string;
  title: string;
  detail: string;
  event: string;
  group: 'workflow' | 'parallel' | 'safety';
};

const standardSteps: PipelineStep[] = [
  { id: 'intake', component: 'Intake Agent', title: 'Normalize incoming information', detail: 'The intake stage parses the supplied state and prepares normalized symptom and context fields.', event: 'AGENT_STARTED → AGENT_COMPLETED', group: 'workflow' },
  { id: 'symptom', component: 'Symptom Agent', title: 'Analyze symptoms and urgency', detail: 'Symptom analysis produces an urgency value used by the conditional routing gate.', event: 'AGENT_STARTED → AGENT_COMPLETED', group: 'safety' },
  { id: 'parallel', component: 'Diagnosis graph node', title: 'Launch parallel specialist tasks', detail: 'The registered LangGraph node named diagnosis starts diagnosis and drug-safety tasks concurrently, then merges their results.', event: 'AGENT_STARTED · parallel wrapper', group: 'parallel' },
  { id: 'diagnosis', component: 'Diagnosis Agent', title: 'Build differential analysis', detail: 'A simulated specialist task evaluates the available clinical state and produces a differential result.', event: 'AGENT_STARTED → AGENT_COMPLETED', group: 'parallel' },
  { id: 'drug', component: 'Drug-safety Agent', title: 'Review medication safety', detail: 'A simulated concurrent task checks the medication-safety branch. No real medication or patient data is processed.', event: 'AGENT_STARTED → AGENT_COMPLETED', group: 'parallel' },
  { id: 'report', component: 'Report Agent', title: 'Synthesize the report', detail: 'The report stage combines the simulated state and marks the illustrative workflow complete.', event: 'AGENT_STARTED → AGENT_COMPLETED', group: 'workflow' },
  { id: 'complete', component: 'Pipeline', title: 'Complete simulated run', detail: 'The demonstration has reached its terminal state. This is not a clinical result or a live backend trace.', event: 'PIPELINE_COMPLETED', group: 'workflow' },
];

const criticalSteps: PipelineStep[] = [
  standardSteps[0],
  { ...standardSteps[1], detail: 'In this scenario, symptom analysis returns a simulated critical urgency value.' },
  { id: 'critical-gate', component: 'Conditional routing gate', title: 'Take the critical-urgency route', detail: 'The orchestrator routes directly to reporting when urgency is critical, bypassing the full diagnosis and drug-safety analysis wrapper.', event: 'CONDITIONAL ROUTE → report', group: 'safety' },
  { ...standardSteps[5], detail: 'The report stage receives the available state on the critical route. This demonstration does not generate medical advice.' },
  standardSteps[6],
];

export default function PipelineExecutionSimulator() {
  const [scenario, setScenario] = useState<Scenario>('standard');
  const [stepIndex, setStepIndex] = useState(-1);

  const steps = useMemo(() => scenario === 'critical' ? criticalSteps : standardSteps, [scenario]);
  const activeStep = stepIndex >= 0 ? steps[stepIndex] : undefined;
  const finished = stepIndex === steps.length - 1;

  function chooseScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    setStepIndex(-1);
  }

  function advance() {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function reset() {
    setStepIndex(-1);
  }

  return (
    <section className="mx-auto max-w-[1600px] space-y-5 px-4 pb-10 md:px-8" aria-labelledby="pipeline-simulator-title">
      <div className="overflow-hidden rounded-3xl border border-violet-300/15 bg-[#0b1425]">
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-400/10 via-cyan-300/5 to-transparent p-6 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
            <Activity className="h-3.5 w-3.5" /> Phase 2 · Simulated execution
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 id="pipeline-simulator-title" className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Walk through a pipeline run</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">
                Advance one step at a time to see how the orchestrator routes work, what the event stream might look like,
                and why a critical-urgency path differs from the standard path.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => chooseScenario('standard')} aria-pressed={scenario === 'standard'} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${scenario === 'standard' ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-[#091222] text-slate-300 hover:border-white/20'}`}>
                Standard route
              </button>
              <button type="button" onClick={() => chooseScenario('critical')} aria-pressed={scenario === 'critical'} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${scenario === 'critical' ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-[#091222] text-slate-300 hover:border-white/20'}`}>
                <AlertTriangle className="h-4 w-4" /> Critical route
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-5 md:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Execution timeline</p>
                <p className="mt-1 text-sm text-slate-300">{stepIndex < 0 ? 'Ready to begin' : `Step ${stepIndex + 1} of ${steps.length}`}</p>
              </div>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 transition-all duration-300" style={{ width: `${stepIndex < 0 ? 0 : ((stepIndex + 1) / steps.length) * 100}%` }} />
              </div>
            </div>

            <ol className="space-y-3">
              {steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isComplete = index < stepIndex;
                return (
                  <li key={step.id} className={`relative rounded-2xl border p-4 transition-all duration-300 ${isActive ? 'border-cyan-300/40 bg-cyan-300/[0.07] shadow-[0_0_28px_rgba(34,211,238,0.06)]' : isComplete ? 'border-emerald-300/20 bg-emerald-300/[0.035]' : 'border-white/[0.07] bg-[#0a1322]/70'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isComplete ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : isActive ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-500'}`}>
                        {isComplete ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <Play className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`font-medium ${isActive ? 'text-cyan-100' : isComplete ? 'text-emerald-100' : 'text-slate-200'}`}>{step.component}</p>
                          {step.group === 'parallel' && <span className="rounded-md border border-violet-300/20 bg-violet-300/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">Parallel branch</span>}
                          {isActive && <span className="rounded-md bg-cyan-300/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-100">Active step</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{step.title}</p>
                        {(isActive || isComplete) && <p className="mt-2 text-sm leading-6 text-slate-300">{step.detail}</p>}
                        {isActive && <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 font-mono text-[11px] text-cyan-100"><GitBranch className="h-3.5 w-3.5" /> {step.event}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="border-t border-white/10 bg-[#091222]/70 p-5 md:p-7 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected step</p>
            {activeStep ? (
              <div className="mt-4 space-y-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"><Activity className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{activeStep.component}</h3>
                  <p className="mt-1 text-sm text-slate-400">{activeStep.title}</p>
                </div>
                <p className="text-sm leading-6 text-slate-300">{activeStep.detail}</p>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Illustrative event</p>
                  <p className="mt-2 break-words font-mono text-xs leading-5 text-cyan-100">{activeStep.event}</p>
                </div>
                {finished && <p className="flex items-start gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-xs leading-5 text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Demo complete. Reset to run this scenario again or switch routes.</p>}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300"><Play className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold text-white">{scenario === 'critical' ? 'Critical-urgency path' : 'Standard analysis path'}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Start the walkthrough to highlight each component and reveal its illustrative event. No backend request will be sent.</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#101a2b] px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20"><RotateCcw className="h-4 w-4" /> Reset</button>
              <button type="button" onClick={advance} disabled={finished} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
                {stepIndex < 0 ? <><Play className="h-4 w-4" /> Start</> : <>{finished ? 'Completed' : 'Next step'}{!finished && <SkipForward className="h-4 w-4" />}</>}
              </button>
            </div>
            <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-3">
              <p className="flex items-start gap-2 text-xs leading-5 text-amber-100"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> <span><strong>Simulation only.</strong> All events are illustrative. No patient data is used, no agents are invoked, and no live WebSocket or clinical service is connected.</span></p>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><ArrowRight className="h-3.5 w-3.5" /> Event names mirror the backend schema; timing and results are mocked.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
