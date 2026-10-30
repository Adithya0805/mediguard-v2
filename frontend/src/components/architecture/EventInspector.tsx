'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileCode, 
  Copy, 
  Check, 
  ArrowRight, 
  Info, 
  ShieldAlert, 
  Activity, 
  Layers, 
  Hash, 
  Clock, 
  Cpu, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { TimelineEvent } from './types';

interface EventInspectorProps {
  selectedEvent: TimelineEvent | null;
  totalEvents: number;
  onNextEvent?: () => void;
  onPrevEvent?: () => void;
}

export default function EventInspector({
  selectedEvent,
  totalEvents,
  onNextEvent,
  onPrevEvent
}: EventInspectorProps) {
  const [copied, setCopied] = useState(false);

  if (!selectedEvent) {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-surface border border-border/80 rounded-2xl text-center">
        <Layers className="h-10 w-10 text-text-muted mb-3 animate-pulse" />
        <h4 className="font-bold text-sm text-text-primary">No Event Selected</h4>
        <p className="text-xs text-text-secondary max-w-sm mt-1">
          Click any step in the Execution Timeline to inspect its source schema, raw JSON telemetry payload, and state transitions.
        </p>
      </div>
    );
  }

  const handleCopyJSON = () => {
    const jsonStr = JSON.stringify(
      {
        event_type: selectedEvent.eventType,
        session_id: 'session-simulated-trace-01',
        agent_name: selectedEvent.agentId,
        timestamp: selectedEvent.simulatedTimestamp,
        message: selectedEvent.message,
        data: selectedEvent.dataPayload
      },
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-4 bg-surface border border-border/80 rounded-2xl p-5 shadow-xl text-left">
      
      {/* Inspector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/70 gap-2">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-primary" />
          <h3 className="font-sans font-bold text-base text-text-primary">
            Event Inspector
          </h3>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Event #{selectedEvent.sequenceNumber} of {totalEvents}
          </span>
        </div>

        {/* Step Navigation Controls */}
        <div className="flex items-center gap-2">
          {onPrevEvent && (
            <button
              onClick={onPrevEvent}
              disabled={selectedEvent.sequenceNumber <= 1}
              className="px-2.5 py-1 text-xs rounded-lg bg-surface-raised border border-border/60 text-text-secondary hover:text-text-primary disabled:opacity-40 transition-all font-mono"
            >
              &larr; Prev Event
            </button>
          )}
          {onNextEvent && (
            <button
              onClick={onNextEvent}
              disabled={selectedEvent.sequenceNumber >= totalEvents}
              className="px-2.5 py-1 text-xs rounded-lg bg-surface-raised border border-border/60 text-text-secondary hover:text-text-primary disabled:opacity-40 transition-all font-mono"
            >
              Next Event &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Primary Key-Value Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        
        {/* Field 1: Event Name */}
        <div className="p-3 rounded-xl bg-[#0b101e] border border-border/60 flex flex-col">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Event Name</span>
          <span className="font-mono text-xs font-semibold text-primary truncate mt-0.5">
            {selectedEvent.eventType}
          </span>
          <span className="text-[9px] text-slate-500 mt-1">backend/schemas/websocket.py</span>
        </div>

        {/* Field 2: Source Component */}
        <div className="p-3 rounded-xl bg-[#0b101e] border border-border/60 flex flex-col">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Source Component</span>
          <span className="font-mono text-xs font-semibold text-text-primary truncate mt-0.5">
            {selectedEvent.sourceComponent}
          </span>
          <span className="text-[9px] text-slate-500 mt-1">Agent / Supervisor Node</span>
        </div>

        {/* Field 3: Sequence & Status */}
        <div className="p-3 rounded-xl bg-[#0b101e] border border-border/60 flex flex-col">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Status & Order</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-xs font-bold text-text-primary">
              #{selectedEvent.sequenceNumber}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded capitalize ${
              selectedEvent.status === 'completed'
                ? 'bg-emerald-500/15 text-emerald-400'
                : selectedEvent.status === 'skipped'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-sky-500/15 text-sky-400'
            }`}>
              {selectedEvent.status}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 mt-1">Lifecycle state</span>
        </div>

        {/* Field 4: Illustrative Timestamp */}
        <div className="p-3 rounded-xl bg-[#0b101e] border border-border/60 flex flex-col">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Simulated Elapsed</span>
          <span className="font-mono text-xs font-semibold text-amber-400 truncate mt-0.5">
            {selectedEvent.elapsedTimeLabel}
          </span>
          <span className="text-[9px] text-amber-500/80 mt-1">Illustrative timing only</span>
        </div>
      </div>

      {/* Plain Language Explanation Panel */}
      <div className="p-3.5 rounded-xl bg-[#0a1122] border border-primary/20 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
          <Info className="h-3.5 w-3.5" />
          <span>Clinical & Architectural Explanation</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          {selectedEvent.plainLanguageExplanation}
        </p>
      </div>

      {/* Next Expected Pipeline Transition */}
      <div className="p-3 rounded-xl bg-surface-raised border border-border/70 flex items-start gap-2.5">
        <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Next Expected Pipeline Transition
          </span>
          <span className="font-mono text-xs text-text-primary mt-0.5">
            {selectedEvent.nextTransition}
          </span>
        </div>
      </div>

      {/* Formatted JSON Payload Preview */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <span>WebSocket AgentEvent Payload</span>
            </span>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              Real Backend Schema
            </span>
          </div>

          <button
            onClick={handleCopyJSON}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-raised border border-border text-[11px] font-mono text-text-secondary hover:text-text-primary hover:border-primary/40 transition-all"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Code block preview */}
        <div className="relative rounded-xl bg-[#070b14] border border-border/80 p-3.5 overflow-x-auto max-h-64 font-mono text-xs text-slate-300 leading-normal">
          <pre>
            {JSON.stringify(
              {
                event_type: selectedEvent.eventType,
                session_id: 'session-simulated-trace-01',
                agent_name: selectedEvent.agentId,
                timestamp: selectedEvent.simulatedTimestamp,
                message: selectedEvent.message,
                data: selectedEvent.dataPayload
              },
              null,
              2
            )}
          </pre>
        </div>
        <span className="text-[10px] text-text-muted italic">
          * Source verified against backend AgentEvent (Pydantic model) and AgentState TypedDict. All simulated values are educational examples.
        </span>
      </div>

    </div>
  );
}
