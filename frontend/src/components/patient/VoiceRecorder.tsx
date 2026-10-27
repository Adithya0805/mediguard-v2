'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Square, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Volume2,
  Sparkles,
  Play,
  RotateCcw,
  Activity,
  HeartPulse,
  Pill,
  ShieldAlert
} from 'lucide-react';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { parseVoiceTranscript, VoiceParseResult } from '@/lib/api';
import { playClinicalSound } from '@/lib/audio';
import AudioWaveVisualizer from './AudioWaveVisualizer';
import { toast } from 'sonner';

type RecorderState = 'idle' | 'recording' | 'processing' | 'complete';

interface VoiceRecorderProps {
  /** Called when user accepts the parsed data to fill the form */
  onParsed: (parsedData: Record<string, unknown>, fieldsExtracted?: string[]) => void;
  /** Current form data (for merge mode) */
  existingFormData?: Record<string, unknown>;
  /** Called when user closes the recorder without accepting */
  onClose?: () => void;
}

interface DictationPreset {
  id: string;
  title: string;
  category: string;
  badgeColor: string;
  transcript: string;
}

const SAMPLE_DICTATIONS: DictationPreset[] = [
  {
    id: 'acs',
    title: 'Emergency ACS Triage (62M)',
    category: 'Cardiology Critical',
    badgeColor: 'border-red-500/40 text-red-400 bg-red-500/10',
    transcript:
      "Okay, patient is John Thomas, a 62 year old male presenting with severe crushing substernal chest pain radiating down his left arm and jaw for the past 2 hours. He has notable diaphoresis, nausea, and shortness of breath. Medical history is significant for prior myocardial infarction 5 years ago and hypertension. Current medications: Aspirin 81mg, Atorvastatin 40mg, and Metoprolol 25mg daily. No known drug allergies. Vitals right now: blood pressure is 170 over 100, heart rate 110 bpm, temperature 37.1 Celsius, SpO2 96 percent on room air, weight 82 kilos."
  },
  {
    id: 'sepsis',
    title: 'Severe Sepsis Alert (71F)',
    category: 'ICU / Sepsis-3',
    badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    transcript:
      "This is Margaret Hayes, a 71 year old female brought from nursing home with acute confusion, high fever, and extreme lethargy for 24 hours. Complaining of severe dysuria and rigors. History of recurrent UTI and type 2 diabetes. She takes Metformin 1000mg. Allergic to Sulfa drugs. Vitals show critical hypotension: blood pressure is 88 over 54, heart rate 118, temperature 39.2 Celsius, respiratory rate 24, oxygen saturation 91 percent, weight 65 kilos."
  },
  {
    id: 'polypharmacy',
    title: 'Polypharmacy Fall & Bleed (78M)',
    category: 'Pharmacovigilance',
    badgeColor: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
    transcript:
      "Patient is Robert Chen, a 78 year old gentleman admitted after a mechanical fall at home with persistent dizziness and lightheadedness. Past history includes atrial fibrillation, hypertension, and chronic insomnia. Current medications: Warfarin 5mg daily, Diltiazem 120mg, Zolpidem 10mg, and Lisinopril 20mg. Denies allergies. Blood pressure is 102 over 64, heart rate is bradycardic at 56 bpm, SpO2 97 percent, weight 74 kilos."
  }
];

export default function VoiceRecorder({ onParsed, existingFormData, onClose }: VoiceRecorderProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    confidence,
    error,
    duration,
    startListening,
    stopListening,
    resetTranscript,
    appendMode,
    setAppendMode,
  } = useVoiceTranscription();

  const [state, setState] = useState<RecorderState>('idle');
  const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null);
  const [parsingStage, setParsingStage] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedTranscript, setSimulatedTranscript] = useState('');
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayTranscript = isSimulating ? simulatedTranscript : transcript;

  const parsedData = (parseResult?.parsed_data || {}) as any;
  const summaryItems: Array<[string, string, string]> = parseResult ? [
    ['patient_name', 'Name', (parsedData.patient_name as string) || ''],
    ['patient_age', 'Age', Number(parsedData.patient_age) > 0 ? `${parsedData.patient_age} yrs` : ''],
    ['patient_gender', 'Gender', (parsedData.patient_gender as string) || ''],
    ['chief_complaint', 'Chief Complaint', parsedData.chief_complaint || ''],
    ['symptoms', 'Symptoms', Array.isArray(parsedData.symptoms) && parsedData.symptoms.length > 0 ? `${parsedData.symptoms.length} extracted` : ''],
    ['current_medications', 'Medications', Array.isArray(parsedData.current_medications) && parsedData.current_medications.length > 0 ? `${parsedData.current_medications.length} detected` : ''],
    ['medical_history', 'Medical History', Array.isArray(parsedData.medical_history) && parsedData.medical_history.length > 0 ? `${parsedData.medical_history.length} conditions` : ''],
    ['allergies', 'Allergies', Array.isArray(parsedData.allergies) && parsedData.allergies.length > 0 ? parsedData.allergies.join(', ') : 'No allergies'],
  ] : [];

  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStart = useCallback(() => {
    setIsSimulating(false);
    resetTranscript();
    setState('recording');
    playClinicalSound('start');
    startListening();
  }, [startListening, resetTranscript]);

  const runParseExecution = useCallback(async (transcriptText: string) => {
    setState('processing');
    setParsingStage('Receiving clinical transcript...');
    playClinicalSound('step');

    try {
      await new Promise((r) => setTimeout(r, 250));
      setParsingStage('Extracting symptoms & complaint...');
      await new Promise((r) => setTimeout(r, 250));
      setParsingStage('Mapping medications & vitals...');

      const result = await parseVoiceTranscript(
        transcriptText.trim(),
        existingFormData
      );

      setParsingStage('Evaluating clinical red flags & interactions...');
      await new Promise((r) => setTimeout(r, 200));

      setParseResult(result);
      setState('complete');

      if (result.red_flags_detected) {
        playClinicalSound('alert');
      } else {
        playClinicalSound('complete');
      }
    } catch (err: unknown) {
      console.error('Voice parse error:', err);
      toast.error('Failed to parse voice transcript. Please try again.');
      setState('idle');
    }
  }, [existingFormData]);

  const handleStop = useCallback(async () => {
    stopListening();
    const currentTranscript = displayTranscript + (interimTranscript ? ' ' + interimTranscript : '');
    
    if (!currentTranscript.trim() || currentTranscript.trim().length < 15) {
      toast.warning('Please speak more details about the patient before stopping.');
      setState('idle');
      return;
    }

    await runParseExecution(currentTranscript);
  }, [stopListening, displayTranscript, interimTranscript, runParseExecution]);

  const handleStartSimulation = useCallback((preset: DictationPreset) => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    
    setIsSimulating(true);
    setSimulatedTranscript('');
    resetTranscript();
    setState('recording');
    playClinicalSound('start');

    const fullText = preset.transcript;
    const words = fullText.split(' ');
    let currentIdx = 0;

    simulationTimerRef.current = setInterval(() => {
      currentIdx += 2;
      const slice = words.slice(0, currentIdx).join(' ');
      setSimulatedTranscript(slice);

      if (currentIdx >= words.length) {
        if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
        setTimeout(() => {
          runParseExecution(fullText);
        }, 350);
      }
    }, 70);
  }, [resetTranscript, runParseExecution]);

  const handleAccept = useCallback(() => {
    if (!parseResult) return;
    playClinicalSound('complete');
    onParsed(parseResult.parsed_data, parseResult.fields_extracted);
    toast.success('✨ Ambient Voice Intake accepted! Form fields populated.');
  }, [parseResult, onParsed]);

  const handleReset = useCallback(() => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsSimulating(false);
    setSimulatedTranscript('');
    resetTranscript();
    setParseResult(null);
    setState('idle');
  }, [resetTranscript]);

  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-2xl relative">
      
      {/* Top Banner */}
      <div className="px-6 py-4 bg-gradient-to-r from-primary/10 via-surface to-background border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_12px_rgba(13,148,136,0.3)]">
            <Volume2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary tracking-tight">Ambient Clinical Voice Intake</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold">
                Gemini / Haiku AI
              </span>
            </div>
            <p className="text-xs text-text-muted">Speech-to-Structured-Triage with real-time clinical entity extraction</p>
          </div>
        </div>

        {state !== 'idle' && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-lg bg-surface-raised border border-border transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ── STATE: IDLE ─────────────────────────────────────────── */}
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 space-y-6"
          >
            {/* Visual waveform placeholder */}
            <AudioWaveVisualizer isRecording={false} />

            {/* Quick action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="voice-start-btn"
                type="button"
                onClick={handleStart}
                disabled={!isSupported}
                className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-[0_0_18px_rgba(13,148,136,0.35)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Mic className="h-5 w-5" />
                <span>Start Live Voice Dictation</span>
              </button>
            </div>

            {!isSupported && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <MicOff className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Microphone access not supported in this browser. You can still test with the 1-Click Sample Dictations below!</span>
              </div>
            )}

            {/* 1-Click Clinical Sample Dictation Presets */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Or Try 1-Click Sample Dictation (Instant Reviewer Demo)
                </span>
                <span className="text-[10px] text-text-muted">No mic required</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SAMPLE_DICTATIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleStartSimulation(preset)}
                    className="p-3.5 rounded-xl bg-surface-raised border border-border hover:border-primary/50 text-left transition-all hover:scale-[1.01] hover:shadow-lg group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}>
                          {preset.category}
                        </span>
                        <Play className="h-3.5 w-3.5 text-text-muted group-hover:text-primary transition-colors" />
                      </div>
                      <h4 className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                        {preset.title}
                      </h4>
                      <p className="text-[11px] text-text-muted line-clamp-2 mt-1 leading-relaxed">
                        {preset.transcript}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-primary font-semibold">
                      <span>Simulate Dictation</span>
                      <span>→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STATE: RECORDING ────────────────────────────────────── */}
        {state === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 space-y-4"
          >
            {/* Header & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-60" />
                </div>
                <span className="text-xs font-bold text-red-400 tracking-widest uppercase">
                  {isSimulating ? 'Simulating Clinical Audio Stream' : 'Live Ambient Listening'}
                </span>
              </div>
              <span className="text-xs font-mono text-text-muted tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Live Audio Visualizer */}
            <AudioWaveVisualizer isRecording={true} isSimulating={isSimulating} />

            {/* Live Streaming Transcript */}
            <div className="min-h-[110px] max-h-[160px] overflow-y-auto p-4 rounded-xl bg-background border border-primary/30 text-sm leading-relaxed shadow-inner">
              {displayTranscript ? (
                <span className="text-text-primary">{displayTranscript}</span>
              ) : (
                <span className="text-text-muted italic text-xs">Listening for clinician speech... Speak naturally.</span>
              )}
              {interimTranscript && !isSimulating && (
                <span className="text-text-muted/60 italic"> {interimTranscript}</span>
              )}
            </div>

            {/* Confidence metric */}
            {confidence > 0 && !isSimulating && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>Speech Transcription Confidence</span>
                  <span className="font-mono">{confidence}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                  />
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 pt-2">
              <button
                id="voice-stop-btn"
                type="button"
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all shadow-[0_0_12px_rgba(239,68,68,0.2)]"
              >
                <Square className="h-4 w-4 fill-current" />
                <span>Stop & Extract Entities</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STATE: PROCESSING ───────────────────────────────────── */}
        {state === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <div>
                <h3 className="text-sm font-bold text-text-primary">Clinical NLP Entity Extraction</h3>
                <p className="text-xs text-primary font-medium">{parsingStage}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-teal-400 to-emerald-400 rounded-full"
                  initial={{ width: '15%' }}
                  animate={{ width: '92%' }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>Speech Audio Normalized</span>
                <span>Resolving Clinical Taxonomies (SNOMED, RxNorm, LOINC)</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STATE: COMPLETE ─────────────────────────────────────── */}
        {state === 'complete' && parseResult && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400">Structured Triage Entities Extracted</h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                {Math.round(parseResult.extraction_confidence * 100)}% Confidence
              </span>
            </div>

            {/* Extracted Fields Grid */}
            <div className="p-4 rounded-xl bg-background border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                  Structured Fields Extracted ({parseResult.fields_extracted.length})
                </span>
                <span className="text-[10px] text-text-muted font-mono">{parseResult.processing_time_ms}ms latency</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {summaryItems.map(([key, label, value]) => {
                  const hasValue = Boolean(value);
                  return (
                    <div key={key} className="p-2 rounded-lg bg-surface border border-border/50 flex items-start gap-2">
                      <span className={hasValue ? 'text-emerald-400 font-bold' : 'text-text-muted'}>
                        {hasValue ? '✓' : '—'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] text-text-muted block">{label}</span>
                        <span className={`font-medium truncate block ${hasValue ? 'text-text-primary' : 'text-text-muted italic'}`}>
                          {hasValue ? value : 'Not mentioned'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vitals Pills */}
              {parsedData.vitals && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Activity className="h-3 w-3 text-primary" /> Extracted Vitals
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedData.vitals.bp && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono">
                        BP: {parsedData.vitals.bp}
                      </span>
                    )}
                    {parsedData.vitals.heart_rate && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono">
                        HR: {parsedData.vitals.heart_rate} bpm
                      </span>
                    )}
                    {parsedData.vitals.temperature && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono">
                        Temp: {parsedData.vitals.temperature}°C
                      </span>
                    )}
                    {parsedData.vitals.spo2 && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono">
                        SpO2: {parsedData.vitals.spo2}%
                      </span>
                    )}
                    {parsedData.vitals.weight && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono">
                        Weight: {parsedData.vitals.weight} kg
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Red Flag Alert */}
            {parseResult.red_flags_detected && parseResult.parser_notes && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex gap-3 shadow-[0_0_12px_rgba(239,68,68,0.15)]">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wide">Clinical Red Flag Detected</p>
                  <p className="text-xs text-red-300/90 leading-relaxed font-sans">
                    {parseResult.parser_notes.replace(/\[ALERT\]\s*/g, '')}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="voice-accept-btn"
                type="button"
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-[0_0_16px_rgba(13,148,136,0.3)] hover:scale-[1.01]"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Accept & Auto-Populate Form</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-3 rounded-xl bg-surface border border-border text-text-secondary font-semibold text-xs hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                Dictate Again
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
