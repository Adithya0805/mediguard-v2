'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Trash2, 
  Filter, 
  Activity,
  Radio,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AgentEvent } from '@/hooks/useAgentStream';

interface LiveAgentConsoleProps {
  events: AgentEvent[];
  isConnected: boolean;
  isPipelineRunning: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClearEvents?: () => void;
}

export default function LiveAgentConsole({
  events,
  isConnected,
  isPipelineRunning,
  soundEnabled,
  onToggleSound,
  onClearEvents
}: LiveAgentConsoleProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'agents' | 'alerts'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedEventIndex, setExpandedEventIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom whenever new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const filteredEvents = events.filter((ev) => {
    if (filter === 'agents') {
      return Boolean(ev.agent_name);
    }
    if (filter === 'alerts') {
      return (
        ev.event_type.includes('fail') ||
        ev.message.toLowerCase().includes('critical') ||
        ev.message.toLowerCase().includes('alert') ||
        ev.message.toLowerCase().includes('stemi')
      );
    }
    return true;
  });

  const handleCopyLogs = () => {
    const logText = events
      .map((e) => `[${e.timestamp}] [${(e.agent_name || 'SYSTEM').toUpperCase()}] ${e.message}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'pipeline_started':
        return { label: 'START', bg: 'bg-primary/20 text-primary border-primary/40' };
      case 'agent_started':
        return { label: 'RUNNING', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40' };
      case 'agent_completed':
        return { label: 'VERIFIED', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
      case 'agent_failed':
      case 'pipeline_failed':
        return { label: 'ALERT', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'pipeline_completed':
        return { label: 'SYNTHESIS', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      default:
        return { label: 'TELEMETRY', bg: 'bg-slate-800 text-text-muted border-slate-700' };
    }
  };

  return (
    <div className={`w-full rounded-2xl bg-[#080d1a] border border-border/80 overflow-hidden shadow-2xl transition-all ${
      isFullScreen ? 'fixed inset-4 z-50 max-h-[92vh] flex flex-col' : ''
    }`}>
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d1424] border-b border-border/70 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-xs text-text-primary tracking-wide">
                LangGraph Multi-Agent Telemetry Stream
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-text-secondary">
                {events.length} Events
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Audio Chirp Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              soundEnabled
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-slate-900 border-slate-800 text-text-muted hover:text-text-secondary'
            }`}
            title={soundEnabled ? 'Clinical audio cue: ON' : 'Clinical audio cue: MUTED'}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {/* Copy Logs Button */}
          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-text-muted hover:text-text-primary hover:bg-slate-800 transition-all text-xs"
            title="Copy all telemetry logs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Full Screen Toggle */}
          <button
            onClick={() => setIsFullScreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-text-muted hover:text-text-primary hover:bg-slate-800 transition-all text-xs"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Collapse / Expand */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-text-muted hover:text-text-primary hover:bg-slate-800 transition-all text-xs"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <>
          {/* Filter Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#0a101f] border-b border-border/50 text-[11px] font-sans">
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider mr-1">Filter:</span>
              {(['all', 'agents', 'alerts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-0.5 rounded-md font-semibold capitalize transition-all ${
                    filter === tab
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-text-muted cursor-pointer hover:text-text-secondary">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-0 h-3 w-3"
                />
                <span className="text-[10px]">Auto-scroll</span>
              </label>

              {onClearEvents && events.length > 0 && (
                <button
                  onClick={onClearEvents}
                  className="text-text-muted hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px]"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Terminal Log Lines */}
          <div 
            ref={scrollRef}
            className={`p-4 font-mono text-[11px] overflow-y-auto space-y-1.5 text-left leading-relaxed ${
              isFullScreen ? 'flex-1' : 'max-h-64'
            }`}
          >
            {filteredEvents.length === 0 ? (
              <div className="py-8 text-center text-text-muted font-sans text-xs">
                {isConnected 
                  ? 'Waiting for agent telemetry stream events...'
                  : 'WebSocket telemetry stream paused. Click Reconnect to resume.'}
              </div>
            ) : (
              filteredEvents.map((ev, idx) => {
                const badge = getEventBadge(ev.event_type);
                const isSelected = expandedEventIndex === idx;
                const timeString = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '00:00:00';

                return (
                  <div 
                    key={idx}
                    className="group rounded p-1 hover:bg-slate-900/60 transition-colors cursor-pointer"
                    onClick={() => setExpandedEventIndex(isSelected ? null : idx)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-text-muted text-[10px] shrink-0 font-mono">
                        {timeString}
                      </span>

                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${badge.bg}`}>
                        {badge.label}
                      </span>

                      {ev.agent_name && (
                        <span className="text-teal-400 font-bold shrink-0">
                          [{ev.agent_name.toUpperCase()}]
                        </span>
                      )}

                      <span className="text-text-primary flex-1 break-all">
                        {ev.message}
                      </span>
                    </div>

                    {/* Expandable Event Payload */}
                    {isSelected && ev.data && Object.keys(ev.data).length > 0 && (
                      <div className="mt-1.5 ml-14 p-2.5 rounded-lg bg-surface border border-border/80 text-[10px] text-teal-300 overflow-x-auto">
                        <pre>{JSON.stringify(ev.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Pulsing Active Stream Indicator */}
            {isPipelineRunning && (
              <div className="flex items-center gap-2 pt-2 text-teal-400 font-mono text-[10px]">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
                <span>Agent graph reasoning nodes actively executing...</span>
                <span className="animate-pulse">▋</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
