'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  CircleDot, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Split, 
  GitMerge, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Search,
  Pill,
  FileText,
  ClipboardList,
  Server
} from 'lucide-react';
import { TimelineEvent, TimelineStepStatus, EventFilterGroup } from './types';

interface ExecutionTimelineProps {
  events: TimelineEvent[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  activeFilter: EventFilterGroup;
  onChangeFilter: (filter: EventFilterGroup) => void;
  currentStepIndex: number; // 0 to events.length - 1
  isCriticalRoute: boolean;
}

export default function ExecutionTimeline({
  events,
  selectedEventId,
  onSelectEvent,
  activeFilter,
  onChangeFilter,
  currentStepIndex,
  isCriticalRoute
}: ExecutionTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter events based on activeFilter
  const filteredEvents = events.filter((evt) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'workflow') return evt.eventGroup === 'workflow';
    if (activeFilter === 'safety') return evt.eventGroup === 'safety';
    if (activeFilter === 'parallel') return evt.isParallel || evt.eventGroup === 'parallel';
    return true;
  });

  // Calculate overall timeline progress based on currentStepIndex
  const progressPercent = events.length > 0 
    ? Math.round(((currentStepIndex + 1) / events.length) * 100) 
    : 0;

  // Helper for status styling
  const getStatusBadge = (status: TimelineStepStatus, isStepActive: boolean) => {
    if (isStepActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-sky-400 animate-pulse">
          <CircleDot className="h-3 w-3 animate-spin" />
          ACTIVE
        </span>
      );
    }
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            COMPLETED
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            BYPASSED
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <XCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
            PENDING
          </span>
        );
    }
  };

  const getAgentIcon = (agentId: string | null, isParallel?: boolean) => {
    switch (agentId) {
      case 'intake':
        return <ClipboardList className="h-4 w-4 text-sky-400" />;
      case 'symptom':
        return <Activity className="h-4 w-4 text-amber-400" />;
      case 'diagnosis':
        return <Search className="h-4 w-4 text-indigo-400" />;
      case 'drug_check':
        return <Pill className="h-4 w-4 text-emerald-400" />;
      case 'report':
        return <FileText className="h-4 w-4 text-teal-400" />;
      case 'orchestrator':
      default:
        return isParallel ? <Split className="h-4 w-4 text-purple-400" /> : <Server className="h-4 w-4 text-slate-300" />;
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 bg-surface border border-border/80 rounded-2xl p-5 shadow-xl">
      
      {/* ── Top Bar: Title, Progress, and Filter Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-base text-text-primary flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Execution Timeline</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
              Phase 3 Live Trace
            </span>
            {isCriticalRoute && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400">
                🚨 Emergency Route
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Sequential and parallel pipeline telemetry. Click any event to inspect state transitions.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto">
          <span className="text-[11px] font-medium text-text-muted mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {(['all', 'workflow', 'safety', 'parallel'] as EventFilterGroup[]).map((grp) => (
            <button
              key={grp}
              onClick={() => onChangeFilter(grp)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeFilter === grp
                  ? 'bg-primary text-text-primary shadow-sm'
                  : 'bg-surface-raised border border-border/60 text-text-secondary hover:text-text-primary hover:border-border'
              }`}
            >
              {grp === 'all' ? 'All Events' : grp === 'safety' ? 'Safety & Routing' : grp === 'parallel' ? 'Parallel Execution' : 'Workflow'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Progress & Illustrative Timings Disclaimer ── */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#0c1222] border border-border/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">Pipeline Progress:</span>
            <span className="font-mono text-primary font-bold">{progressPercent}%</span>
            <span className="text-[11px] text-text-muted">
              (Step {Math.min(currentStepIndex + 1, events.length)} of {events.length})
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Info className="h-3 w-3 flex-shrink-0" />
            <span>All timestamps & durations are illustrative architectural simulations</span>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${isCriticalRoute ? 'bg-gradient-to-r from-primary via-amber-400 to-rose-400' : 'bg-gradient-to-r from-primary to-emerald-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* ── Timeline Events List ── */}
      <div className="relative flex flex-col gap-3 py-2 text-left">
        {/* Continuous vertical timeline connector line */}
        <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-border/80 z-0 pointer-events-none" />

        {filteredEvents.map((evt, idx) => {
          const originalIndex = events.findIndex(e => e.id === evt.id);
          const isSelected = selectedEventId === evt.id;
          const isCurrentActive = originalIndex === currentStepIndex;
          const isPast = originalIndex < currentStepIndex;
          const isExpanded = !!expandedEvents[evt.id];

          // Determine visual status dynamically based on currentStepIndex playback position
          let dynamicStatus: TimelineStepStatus = evt.status;
          if (evt.status === 'skipped') {
            dynamicStatus = 'skipped';
          } else if (originalIndex === currentStepIndex) {
            dynamicStatus = 'active';
          } else if (originalIndex < currentStepIndex) {
            dynamicStatus = 'completed';
          } else {
            dynamicStatus = 'pending';
          }

          return (
            <motion.div
              key={evt.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              onClick={() => onSelectEvent(evt.id)}
              className={`relative z-10 flex flex-col rounded-xl border p-3.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-surface-raised border-primary shadow-lg ring-1 ring-primary/40'
                  : isCurrentActive
                  ? 'bg-surface-raised border-sky-500/50 shadow-md ring-1 ring-sky-500/20'
                  : 'bg-surface/90 border-border/70 hover:border-border hover:bg-surface-raised/50'
              } ${dynamicStatus === 'skipped' ? 'opacity-70 bg-amber-950/10 border-dashed border-amber-500/40' : ''}`}
            >
              {/* Event Card Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  
                  {/* Event Sequence Circle Badge */}
                  <div className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-mono font-bold transition-all ${
                    isCurrentActive
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400 ring-4 ring-sky-500/10'
                      : isPast || dynamicStatus === 'completed'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : dynamicStatus === 'skipped'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {evt.sequenceNumber}
                  </div>

                  {/* Title, Source, and Metadata */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1 rounded bg-slate-800/80 border border-slate-700/60">
                        {getAgentIcon(evt.agentId, evt.isParallel)}
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-text-primary">
                        {evt.title}
                      </span>
                      {evt.isParallel && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                          <Split className="h-2.5 w-2.5" />
                          {evt.parallelBranch === 'sync_point' ? 'Parallel Join' : `Parallel: ${evt.parallelBranch}`}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-[11px] text-text-muted mt-1">
                      <span className="font-mono text-primary font-medium">{evt.sourceComponent}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {evt.elapsedTimeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Badges & Expand Trigger */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusBadge(dynamicStatus, isCurrentActive)}
                  <button
                    onClick={(e) => toggleExpand(evt.id, e)}
                    className="p-1 rounded hover:bg-slate-800 text-text-muted hover:text-text-primary transition-colors"
                    title={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Short Message Summary */}
              <p className="text-xs text-text-secondary mt-2 pl-11 leading-relaxed">
                {evt.message}
              </p>

              {/* ── Expandable Details Section ── */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-3 pl-11 pt-2 border-t border-border/40 flex flex-col gap-2 text-xs"
                  >
                    <div className="p-2.5 rounded-lg bg-[#080d1a] border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                        What happened:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {evt.plainLanguageExplanation}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-text-muted bg-slate-900/60 px-2.5 py-1.5 rounded-lg">
                      <span className="text-primary font-semibold">Transition:</span>
                      <span className="truncate max-w-[320px] sm:max-w-md">{evt.nextTransition}</span>
                    </div>

                    <div className="text-[10px] text-text-muted font-mono flex items-center justify-between">
                      <span>Timestamp: {evt.simulatedTimestamp}</span>
                      <span className="text-primary hover:underline cursor-pointer" onClick={() => onSelectEvent(evt.id)}>
                        Inspect Full JSON &rarr;
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
