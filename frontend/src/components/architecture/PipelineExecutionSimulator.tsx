'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  FastForward, 
  Workflow, 
  Layers, 
  Database, 
  Split, 
  ShieldCheck, 
  AlertTriangle, 
  Info,
  Sliders,
  Keyboard,
  Compass
} from 'lucide-react';
import { STANDARD_ROUTE_EVENTS, CRITICAL_ROUTE_EVENTS } from './simulationData';
import { SimulationRoute, TimelineEvent, EventFilterGroup } from './types';
import ExecutionTimeline from './ExecutionTimeline';
import EventInspector from './EventInspector';
import InputOutputInspector from './InputOutputInspector';
import RoutingDiagnostics from './RoutingDiagnostics';
import ParallelExecutionViewer from './ParallelExecutionViewer';

interface PipelineExecutionSimulatorProps {
  initialRoute?: SimulationRoute;
}

export default function PipelineExecutionSimulator({
  initialRoute = 'standard'
}: PipelineExecutionSimulatorProps) {
  const [route, setRoute] = useState<SimulationRoute>(initialRoute);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState<number>(1400); // 1.4s per step
  const [activeFilter, setActiveFilter] = useState<EventFilterGroup>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'io' | 'routing' | 'parallel'>('timeline');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active event dataset based on selected route
  const currentEvents: TimelineEvent[] = route === 'critical' ? CRITICAL_ROUTE_EVENTS : STANDARD_ROUTE_EVENTS;

  // Selected event object
  const selectedEvent = currentEvents.find(e => e.id === selectedEventId) || currentEvents[currentStepIndex] || currentEvents[0];

  // Set initial selected event on mount or route switch
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setSelectedEventId(currentEvents[0]?.id || null);
  }, [route]);

  // When step changes, update selected event if not manually pinned
  const handleStepChange = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(newIndex, currentEvents.length - 1));
    setCurrentStepIndex(clamped);
    setSelectedEventId(currentEvents[clamped]?.id || null);
  };

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev < currentEvents.length - 1) {
        const next = prev + 1;
        setSelectedEventId(currentEvents[next]?.id || null);
        return next;
      } else {
        setIsPlaying(false);
        return prev;
      }
    });
  }, [currentEvents]);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev > 0) {
        const next = prev - 1;
        setSelectedEventId(currentEvents[next]?.id || null);
        return next;
      }
      return 0;
    });
  }, [currentEvents]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setSelectedEventId(currentEvents[0]?.id || null);
  }, [currentEvents]);

  const handleReplay = useCallback(() => {
    handleReset();
    setTimeout(() => {
      setIsPlaying(true);
    }, 150);
  }, [handleReset]);

  // Auto-advance loop when isPlaying is true
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < currentEvents.length - 1) {
          const next = prev + 1;
          setSelectedEventId(currentEvents[next]?.id || null);
          return next;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, playbackSpeedMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeedMs, currentEvents]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleReset]);

  // Determine which stage is currently active based on current event
  const currentStageId = selectedEvent?.stageId || 'intake';

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      
      {/* ── Control Console Bar ── */}
      <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Route Selector & Status */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-border/80">
            <button
              onClick={() => setRoute('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                route === 'standard'
                  ? 'bg-primary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>Standard CDSS Route</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 font-mono">
                Full DDx
              </span>
            </button>
            <button
              onClick={() => setRoute('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                route === 'critical'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-text-secondary hover:text-rose-400'
              }`}
            >
              <span>🚨 Critical Emergency</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-rose-200 font-mono">
                Bypass
              </span>
            </button>
          </div>

          {/* Current Step Counter Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-[#0a0f1d] border border-border/60 text-xs font-mono">
            <span className="text-text-muted">Event: </span>
            <span className="text-primary font-bold">#{currentStepIndex + 1}</span>
            <span className="text-text-muted"> of {currentEvents.length}</span>
          </div>
        </div>

        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Step Back button */}
          <button
            onClick={handlePrev}
            disabled={currentStepIndex <= 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-raised border border-border/70 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border disabled:opacity-40 transition-all"
            title="Previous Event (Left Arrow)"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Play / Pause toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-primary text-text-primary hover:bg-primary/90'
            }`}
            title="Toggle Play / Pause (Spacebar)"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Play Simulation</span>
              </>
            )}
          </button>

          {/* Step Forward button */}
          <button
            onClick={handleNext}
            disabled={currentStepIndex >= currentEvents.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-raised border border-border/70 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border disabled:opacity-40 transition-all"
            title="Next Event (Right Arrow)"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Replay button */}
          <button
            onClick={handleReplay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-raised border border-border/70 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border transition-all"
            title="Replay from start"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay</span>
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-slate-800 transition-all"
            title="Reset to Event #1 ('R')"
          >
            <span>Reset</span>
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 ml-2 text-xs text-text-muted font-mono hidden md:flex">
            <span className="text-[10px]">Speed:</span>
            <button
              onClick={() => setPlaybackSpeedMs(2000)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${playbackSpeedMs === 2000 ? 'bg-primary/20 text-primary font-bold' : 'text-slate-400'}`}
            >
              0.5x
            </button>
            <button
              onClick={() => setPlaybackSpeedMs(1400)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${playbackSpeedMs === 1400 ? 'bg-primary/20 text-primary font-bold' : 'text-slate-400'}`}
            >
              1.0x
            </button>
            <button
              onClick={() => setPlaybackSpeedMs(700)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${playbackSpeedMs === 700 ? 'bg-primary/20 text-primary font-bold' : 'text-slate-400'}`}
            >
              2.0x
            </button>
          </div>

        </div>

      </div>

      {/* ── Diagnostics View Selector Tabs ── */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'timeline'
                ? 'bg-primary/15 border border-primary/40 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Timeline & Event Inspector</span>
          </button>

          <button
            onClick={() => setActiveSubTab('io')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'io'
                ? 'bg-primary/15 border border-primary/40 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Stage I/O & State Diff</span>
          </button>

          <button
            onClick={() => setActiveSubTab('routing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'routing'
                ? 'bg-primary/15 border border-primary/40 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            <Workflow className="h-4 w-4" />
            <span>Routing Diagnostics & Emergency Gate</span>
          </button>

          <button
            onClick={() => setActiveSubTab('parallel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'parallel'
                ? 'bg-primary/15 border border-primary/40 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            <Split className="h-4 w-4" />
            <span>Parallel Swarm (asyncio.gather)</span>
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] text-text-muted font-mono bg-slate-900/60 px-2.5 py-1 rounded-lg border border-border/40">
          <Keyboard className="h-3 w-3" />
          <span>&larr; &rarr; Step | Space Play | R Reset</span>
        </div>
      </div>

      {/* ── Active Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'timeline' && (
          <motion.div
            key="tab-timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Left 7 Columns: Execution Timeline */}
            <div className="lg:col-span-7">
              <ExecutionTimeline
                events={currentEvents}
                selectedEventId={selectedEventId}
                onSelectEvent={(id) => {
                  setSelectedEventId(id);
                  const idx = currentEvents.findIndex(e => e.id === id);
                  if (idx !== -1) setCurrentStepIndex(idx);
                }}
                activeFilter={activeFilter}
                onChangeFilter={setActiveFilter}
                currentStepIndex={currentStepIndex}
                isCriticalRoute={route === 'critical'}
              />
            </div>

            {/* Right 5 Columns: Event Inspector */}
            <div className="lg:col-span-5 sticky top-20">
              <EventInspector
                selectedEvent={selectedEvent}
                totalEvents={currentEvents.length}
                onNextEvent={handleNext}
                onPrevEvent={handlePrev}
              />
            </div>
          </motion.div>
        )}

        {activeSubTab === 'io' && (
          <motion.div
            key="tab-io"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <InputOutputInspector
              currentStageId={currentStageId}
              isCriticalRoute={route === 'critical'}
            />
          </motion.div>
        )}

        {activeSubTab === 'routing' && (
          <motion.div
            key="tab-routing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <RoutingDiagnostics
              currentRoute={route}
              onChangeRoute={setRoute}
            />
          </motion.div>
        )}

        {activeSubTab === 'parallel' && (
          <motion.div
            key="tab-parallel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ParallelExecutionViewer
              currentRoute={route}
              currentStepIndex={currentStepIndex}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
