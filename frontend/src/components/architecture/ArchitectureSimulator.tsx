'use client';

import { useMemo, useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, BrainCircuit, CheckCircle2, CircleHelp,
  Database, GitBranch, Layers3, Network, Search, ShieldAlert, Workflow,
  XCircle, FileText, Server, Stethoscope, Waypoints
} from 'lucide-react';

type LayerId = 'experience' | 'orchestration' | 'agents' | 'intelligence' | 'data' | 'observability';
type Evidence = 'verified' | 'documented' | 'conceptual';
type NodeKind = 'application' | 'graph-node' | 'internal-agent' | 'service' | 'data-store' | 'telemetry';

type ArchitectureNode = {
  id: string;
  label: string;
  subtitle: string;
  layer: LayerId;
  kind: NodeKind;
  evidence: Evidence;
  description: string;
  inputs: string[];
  outputs: string[];
  sourcePaths: string[];
  notes?: string;
};

const layers: { id: LayerId; title: string; eyebrow: string; description: string }[] = [
  { id: 'experience', title: 'Experience layer', eyebrow: '01 · CLIENT', description: 'User-facing MediGuard web application' },
  { id: 'orchestration', title: 'Orchestration layer', eyebrow: '02 · CONTROL FLOW', description: 'FastAPI entry points and LangGraph routing' },
  { id: 'agents', title: 'Agent layer', eyebrow: '03 · SPECIALISTS', description: 'Specialist tasks and conditional execution' },
  { id: 'intelligence', title: 'AI & retrieval layer', eyebrow: '04 · REASONING', description: 'Model routing and evidence retrieval' },
  { id: 'data', title: 'Data & integrations', eyebrow: '05 · CONNECTORS', description: 'Persistence and external clinical interfaces' },
  { id: 'observability', title: 'Events & observability', eyebrow: '06 · TELEMETRY', description: 'Pipeline status and WebSocket event delivery' },
];

const nodes: ArchitectureNode[] = [
  {
    id: 'frontend', label: 'Next.js frontend', subtitle: 'Web experience', layer: 'experience', kind: 'application', evidence: 'verified',
    description: 'The web client provides the user interface for MediGuard workflows. This simulator is a separate explanatory view and does not invoke clinical analysis.',
    inputs: ['User interactions', 'API responses'], outputs: ['HTTP API requests', 'Rendered interface'],
    sourcePaths: ['frontend/src/app/layout.tsx', 'frontend/src/app/page.tsx'],
  },
  {
    id: 'fastapi', label: 'FastAPI application', subtitle: 'API entry point', layer: 'orchestration', kind: 'application', evidence: 'verified',
    description: 'Initializes the backend application, middleware, API routers, and root-level WebSocket route.',
    inputs: ['HTTP requests', 'WebSocket connections'], outputs: ['API responses', 'Mounted API routes', 'WebSocket endpoint'],
    sourcePaths: ['backend/app/main.py', 'backend/app/api/router.py'],
  },
  {
    id: 'langgraph', label: 'LangGraph orchestrator', subtitle: 'Workflow controller', layer: 'orchestration', kind: 'graph-node', evidence: 'verified',
    description: 'Builds the workflow graph, passes shared state between graph nodes, routes after symptom analysis, and handles pipeline completion or failure.',
    inputs: ['Initial AgentState', 'Agent results'], outputs: ['Updated AgentState', 'Pipeline events'],
    sourcePaths: ['backend/app/agents/orchestrator.py'],
    notes: 'Registered graph nodes: intake, symptom, diagnosis (parallel wrapper), and report.',
  },
  {
    id: 'intake', label: 'Intake Agent', subtitle: 'Normalize input', layer: 'agents', kind: 'graph-node', evidence: 'verified',
    description: 'Parses and structures incoming clinical information into a normalized intake representation for downstream workflow steps.',
    inputs: ['Patient intake state'], outputs: ['Parsed intake', 'Normalized symptoms', 'Red flags'],
    sourcePaths: ['backend/app/agents/intake_agent.py'],
  },
  {
    id: 'symptom', label: 'Symptom Agent', subtitle: 'Urgency & symptom analysis', layer: 'agents', kind: 'graph-node', evidence: 'verified',
    description: 'Analyzes symptom information and contributes the urgency state used by the conditional routing gate.',
    inputs: ['Parsed intake', 'Shared state'], outputs: ['Symptom analysis', 'Urgency state'],
    sourcePaths: ['backend/app/agents/symptom_agent.py', 'backend/app/agents/orchestrator.py'],
  },
  {
    id: 'diagnosis', label: 'Diagnosis Agent', subtitle: 'Differential analysis', layer: 'agents', kind: 'internal-agent', evidence: 'verified',
    description: 'Runs differential-diagnosis analysis as one of two concurrent tasks launched by the orchestrator’s diagnosis wrapper.',
    inputs: ['Clinical state', 'Retrieved context'], outputs: ['Differential diagnosis', 'Primary diagnosis'],
    sourcePaths: ['backend/app/agents/diagnosis_agent.py', 'backend/app/agents/orchestrator.py'],
    notes: 'An internal agent task, not a separately registered LangGraph node.',
  },
  {
    id: 'drug-safety', label: 'Drug-safety Agent', subtitle: 'Medication safety', layer: 'agents', kind: 'internal-agent', evidence: 'verified',
    description: 'Runs medication-safety analysis concurrently with diagnosis analysis inside the orchestrator’s parallel wrapper.',
    inputs: ['Medication information', 'Clinical state'], outputs: ['Interaction findings', 'Medication safety state'],
    sourcePaths: ['backend/app/agents/drug_agent.py', 'backend/app/agents/orchestrator.py'],
    notes: 'The mock WebSocket sequence uses the event name drug_check; the internal agent class is DrugAgent.',
  },
  {
    id: 'report', label: 'Report Agent', subtitle: 'Synthesis & output', layer: 'agents', kind: 'graph-node', evidence: 'verified',
    description: 'Compiles available workflow results into a structured clinical report and handles fallback reporting when synthesis fails.',
    inputs: ['Shared state', 'Agent results'], outputs: ['Structured report', 'Report metadata'],
    sourcePaths: ['backend/app/agents/report_agent.py', 'backend/app/agents/orchestrator.py'],
  },
  {
    id: 'llm-router', label: 'LLM Router', subtitle: 'Task-to-model routing', layer: 'intelligence', kind: 'service', evidence: 'verified',
    description: 'Selects a configured model client according to the task type, with fallbacks when a preferred tier is unavailable.',
    inputs: ['Task type'], outputs: ['Configured LLM client'],
    sourcePaths: ['backend/app/llm/router.py', 'backend/app/llm/bedrock_client.py'],
    notes: 'Configured task tiers are visible in source; availability can vary by runtime configuration.',
  },
  {
    id: 'retriever', label: 'Medical Retriever', subtitle: 'RAG context lookup', layer: 'intelligence', kind: 'service', evidence: 'verified',
    description: 'Retrieves context from Pinecone when configured and falls back to a local keyword knowledge base when vector retrieval is unavailable or yields no accepted matches.',
    inputs: ['Search query', 'Top-k settings'], outputs: ['Ranked context chunks', 'Citation metadata'],
    sourcePaths: ['backend/app/rag/retriever.py', 'backend/app/rag/fallback_kb.py'],
    notes: 'Pinecone is a conditional dependency, not a guaranteed active connection in every deployment.',
  },
  {
    id: 'supabase', label: 'Supabase / persistence', subtitle: 'Configured data services', layer: 'data', kind: 'data-store', evidence: 'documented',
    description: 'Supabase/PostgreSQL is described in project documentation and used by backend integrations. Exact runtime usage depends on the endpoint and configuration.',
    inputs: ['Application data'], outputs: ['Persisted records', 'Query results'],
    sourcePaths: ['README.md', 'backend/app/main.py'],
    notes: 'Connection lines are not asserted for every pipeline request.',
  },
  {
    id: 'clinical-integrations', label: 'Clinical integrations', subtitle: 'FHIR / EHR / external sources', layer: 'data', kind: 'service', evidence: 'documented',
    description: 'The repository includes API modules for FHIR import and EHR interoperability, alongside clinical data integrations. These are supporting capabilities rather than guaranteed steps in every run.',
    inputs: ['External clinical resources'], outputs: ['Imported or exchanged clinical data'],
    sourcePaths: ['backend/app/api/router.py', 'README.md'],
    notes: 'Specific services are endpoint-dependent and must not be shown as always executing.',
  },
  {
    id: 'websocket', label: 'WebSocket event manager', subtitle: 'Live event transport', layer: 'observability', kind: 'telemetry', evidence: 'verified',
    description: 'Maintains active WebSocket connections and a bounded in-memory history of events, then broadcasts agent and pipeline state transitions.',
    inputs: ['AgentEvent objects'], outputs: ['WebSocket messages', 'Recent event replay'],
    sourcePaths: ['backend/app/utils/websocket_manager.py', 'backend/app/schemas/websocket.py', 'backend/app/api/v1/websocket.py'],
    notes: 'The WebSocket endpoint also accepts a "simulate" message that runs mock events for frontend testing.',
  },
];

const edges = [
  { from: 'frontend', to: 'fastapi', label: 'HTTP API' },
  { from: 'fastapi', to: 'langgraph', label: 'workflow entry' },
  { from: 'langgraph', to: 'intake', label: '1 · sequential' },
  { from: 'intake', to: 'symptom', label: '2 · sequential' },
  { from: 'symptom', to: 'diagnosis', label: 'non-critical route' },
  { from: 'symptom', to: 'report', label: 'critical bypass' },
  { from: 'diagnosis', to: 'drug-safety', label: 'parallel task' },
  { from: 'diagnosis', to: 'report', label: 'merged state' },
  { from: 'drug-safety', to: 'report', label: 'merged state' },
  { from: 'llm-router', to: 'intake', label: 'model client' },
  { from: 'llm-router', to: 'symptom', label: 'model client' },
  { from: 'llm-router', to: 'diagnosis', label: 'model client' },
  { from: 'llm-router', to: 'drug-safety', label: 'model client' },
  { from: 'llm-router', to: 'report', label: 'model client' },
  { from: 'retriever', to: 'symptom', label: 'context retrieval' },
  { from: 'retriever', to: 'diagnosis', label: 'context retrieval' },
  { from: 'langgraph', to: 'websocket', label: 'pipeline events' },
  { from: 'intake', to: 'websocket', label: 'agent events' },
  { from: 'symptom', to: 'websocket', label: 'agent events' },
  { from: 'diagnosis', to: 'websocket', label: 'agent events' },
  { from: 'drug-safety', to: 'websocket', label: 'agent events' },
  { from: 'report', to: 'websocket', label: 'agent events' },
];

const evidenceLabels: Record<Evidence, string> = {
  verified: 'Source verified',
  documented: 'Documentation-backed',
  conceptual: 'Conceptual',
};

const kindLabels: Record<NodeKind, string> = {
  application: 'Application',
  'graph-node': 'LangGraph node',
  'internal-agent': 'Internal agent task',
  service: 'Service',
  'data-store': 'Data service',
  telemetry: 'Observability',
};

function iconFor(layer: LayerId) {
  if (layer === 'experience') return Network;
  if (layer === 'orchestration') return Workflow;
  if (layer === 'agents') return Stethoscope;
  if (layer === 'intelligence') return BrainCircuit;
  if (layer === 'data') return Database;
  return Activity;
}

export default function ArchitectureSimulator() {
  const [selectedId, setSelectedId] = useState('langgraph');
  const [search, setSearch] = useState('');
  const [activeLayer, setActiveLayer] = useState<LayerId | 'all'>('all');
  const [showConnections, setShowConnections] = useState(true);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  const visibleLayers = useMemo(() => layers.filter((layer) => activeLayer === 'all' || layer.id === activeLayer), [activeLayer]);
  const matchingNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nodes.filter((node) => {
      const inLayer = activeLayer === 'all' || node.layer === activeLayer;
      const matches = !q || [node.label, node.subtitle, node.description, ...node.sourcePaths].join(' ').toLowerCase().includes(q);
      return inLayer && matches;
    });
  }, [activeLayer, search]);

  const connected = edges.filter((edge) => edge.from === selectedId || edge.to === selectedId);
  const relatedNodes = new Set(connected.map((edge) => edge.from === selectedId ? edge.to : edge.from));

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 text-slate-100 md:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-[#0b1425] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.14),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              <Layers3 className="h-3.5 w-3.5" /> Architecture Explorer · Phase 1
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Explore MediGuard’s AI architecture</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Inspect the real components, follow the verified workflow, and understand how the layers fit together.
              This first build is an architecture explainer—not a clinical execution engine.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Source-backed components</span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100"><CircleHelp className="h-4 w-4" /> No live trace yet</span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#101a2b]/90 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search components or source files…" className="w-full rounded-xl border border-white/10 bg-[#091222] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/50" aria-label="Search architecture components" />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={showConnections} onChange={(event) => setShowConnections(event.target.checked)} className="rounded border-white/20 bg-[#091222] text-cyan-400 focus:ring-cyan-400" />
              Emphasize selected connections
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveLayer('all')} className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${activeLayer === 'all' ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-[#101a2b] text-slate-400 hover:text-white'}`}>All layers</button>
            {layers.map((layer) => (
              <button key={layer.id} onClick={() => setActiveLayer(layer.id)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${activeLayer === layer.id ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-[#101a2b] text-slate-400 hover:text-white'}`}>
                {layer.title}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {visibleLayers.map((layer, index) => {
              const LayerIcon = iconFor(layer.id);
              const layerNodes = matchingNodes.filter((node) => node.layer === layer.id);
              if (!layerNodes.length) return null;
              return (
                <section key={layer.id} className="relative">
                  <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#15243a] to-[#0b1424] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] md:p-5">
                    <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
                    <div className="mb-4 flex items-start gap-3">
                      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200"><LayerIcon className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-200/80">{layer.eyebrow}</p>
                        <h2 className="mt-1 text-base font-semibold text-white">{layer.title}</h2>
                        <p className="mt-1 text-xs text-slate-400">{layer.description}</p>
                      </div>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[10px] text-slate-400">{layerNodes.length} component{layerNodes.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                      {layerNodes.map((node) => {
                        const active = node.id === selectedId;
                        const connectedActive = showConnections && relatedNodes.has(node.id);
                        return (
                          <button key={node.id} onClick={() => setSelectedId(node.id)} className={`group relative min-h-[126px] rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${active ? 'border-cyan-300/60 bg-cyan-300/[0.09] shadow-[0_0_0_1px_rgba(103,232,249,0.12),0_12px_28px_rgba(8,145,178,0.10)]' : connectedActive ? 'border-teal-300/30 bg-teal-300/[0.04]' : 'border-white/[0.09] bg-[#091322]/75 hover:border-white/20'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-100">{node.label}</span>
                              {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-200" /> : <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{node.subtitle}</p>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400">{kindLabels[node.kind]}</span>
                              <span className={`rounded-md px-2 py-1 text-[10px] ${node.evidence === 'verified' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-300/10 text-amber-100'}`}>{evidenceLabels[node.evidence]}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {index < visibleLayers.length - 1 && activeLayer === 'all' && (
                    <div className="flex h-7 items-center justify-center gap-2 text-slate-600"><div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-600/70" /><ArrowDown className="h-4 w-4 text-cyan-300/60" /><div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-600/70" /></div>
                  )}
                </section>
              );
            })}
            {matchingNodes.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">No components match that search.</div>}
          </div>
        </div>

        <aside className="h-fit space-y-4 xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#101a2b]">
            <div className="border-b border-white/10 bg-gradient-to-r from-cyan-300/[0.08] to-transparent p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Component inspector</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">{selected.label}</h2>
                  <p className="mt-1 text-xs text-slate-400">{selected.subtitle}</p>
                </div>
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200"><Waypoints className="h-5 w-5" /></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300">{kindLabels[selected.kind]}</span>
                <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200">{evidenceLabels[selected.evidence]}</span>
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">What it does</h3><p className="mt-2 text-sm leading-6 text-slate-200">{selected.description}</p></div>
              {selected.notes && <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100"><CircleHelp className="mb-1 inline h-4 w-4" /> {selected.notes}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/10 p-3"><h3 className="text-xs font-semibold text-slate-300">Inputs</h3><ul className="mt-2 space-y-2">{selected.inputs.map((item) => <li key={item} className="flex gap-2 text-xs leading-4 text-slate-400"><ArrowRight className="h-3 w-3 shrink-0 text-cyan-300" />{item}</li>)}</ul></div>
                <div className="rounded-xl border border-white/10 bg-black/10 p-3"><h3 className="text-xs font-semibold text-slate-300">Outputs</h3><ul className="mt-2 space-y-2">{selected.outputs.map((item) => <li key={item} className="flex gap-2 text-xs leading-4 text-slate-400"><ArrowRight className="h-3 w-3 shrink-0 text-teal-300" />{item}</li>)}</ul></div>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><FileText className="h-4 w-4" /> Source references</h3>
                <ul className="space-y-2">{selected.sourcePaths.map((path) => <li key={path} className="break-all rounded-lg border border-white/[0.08] bg-black/10 px-3 py-2 font-mono text-[10px] leading-4 text-cyan-100/90">{path}</li>)}</ul>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><GitBranch className="h-4 w-4" /> Direct connections ({connected.length})</h3>
                {connected.length ? <ul className="space-y-2">{connected.map((edge, index) => { const otherId = edge.from === selectedId ? edge.to : edge.from; const other = nodes.find((node) => node.id === otherId); return <li key={`${edge.from}-${edge.to}-${index}`}><button onClick={() => setSelectedId(otherId)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-black/10 px-3 py-2 text-left hover:border-cyan-300/30"><span className="text-xs text-slate-200">{other?.label ?? otherId}</span><span className="text-right text-[10px] text-slate-500">{edge.label}</span></button></li>; })}</ul> : <p className="text-xs text-slate-500">No connections are defined for this component.</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
            <div className="flex gap-2"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-200" /><h3 className="text-xs font-semibold text-amber-100">Simulation status</h3></div>
            <p className="mt-2 text-xs leading-5 text-slate-300">Phase 1 is an architecture explorer only. No clinical request is executed, no patient data is loaded, and no live event stream is connected.</p>
          </section>
        </aside>
      </section>
      <footer className="flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>MediGuard V2 · Architecture Explorer · Phase 1 preview</span>
        <span>Source-backed documentation · Not a clinical execution interface</span>
      </footer>
    </main>
  );
}
