'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Square, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Volume2
} from 'lucide-react';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { parseVoiceTranscript, VoiceParseResult } from '@/lib/api';
import { toast } from 'sonner';

type RecorderState = 'idle' | 'recording' | 'processing' | 'complete';

interface VoiceRecorderProps {
  /** Called when user accepts the parsed data to fill the form */
  onParsed: (parsedData: Record<string, unknown>) => void;
  /** Current form data (for merge mode) */
  existingFormData?: Record<string, unknown>;
  /** Called when user closes the recorder without accepting */
  onClose?: () => void;
}

const URGENCY_COLOR: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-amber-400',
  medium: 'text-yellow-400',
  low: 'text-emerald-400',
};

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

  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStart = useCallback(() => {
    resetTranscript();
    setState('recording');
    startListening();
  }, [startListening, resetTranscript]);

  const handleStop = useCallback(async () => {
    stopListening();
    const currentTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');
    
    if (!currentTranscript.trim() || currentTranscript.trim().length < 20) {
      toast.warning('Please speak more details about the patient before stopping.');
      setState('idle');
      return;
    }

    setState('processing');
    setParsingStage('Receiving transcript...');

    try {
      setParsingStage('Extracting symptoms...');
      await new Promise((r) => setTimeout(r, 300));
      setParsingStage('Extracting medications...');
      
      const result = await parseVoiceTranscript(
        currentTranscript.trim(),
        existingFormData
      );

      setParsingStage('Checking red flags...');
      await new Promise((r) => setTimeout(r, 200));

      setParseResult(result);
      setState('complete');
    } catch (err: unknown) {
      console.error('Voice parse error:', err);
      toast.error('Failed to parse voice transcript. Please try again.');
      setState('idle');
    }
  }, [stopListening, transcript, interimTranscript, existingFormData]);

  const handleAddMore = useCallback(() => {
    setAppendMode(true);
    setState('recording');
    startListening();
  }, [startListening, setAppendMode]);

  const handleAccept = useCallback(() => {
    if (!parseResult) return;
    onParsed(parseResult.parsed_data);
    toast.success('Voice intake accepted. Form fields pre-filled!');
  }, [parseResult, onParsed]);

  const handleReset = useCallback(() => {
    resetTranscript();
    setParseResult(null);
    setState('idle');
  }, [resetTranscript]);

  // Unsupported browser
  if (!isSupported) {
    return (
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-6 text-center space-y-3">
        <MicOff className="h-8 w-8 text-amber-400 mx-auto" />
        <p className="text-sm font-semibold text-amber-300">Voice Input Not Supported</p>
        <p className="text-xs text-text-secondary">
          Voice input requires Chrome, Edge, or Safari browser. Please use manual entry below.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xl">
      <AnimatePresence mode="wait">

        {/* ── STATE: IDLE ─────────────────────────────────────────── */}
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Volume2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">🎤 Voice Patient Intake</h3>
                <p className="text-xs text-text-muted">AI-powered speech-to-form filling</p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2">
              <p className="text-xs text-text-secondary leading-relaxed">
                Speak naturally about the patient. MediGuard will extract and fill all form fields automatically.
              </p>
              <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[11px] text-text-muted font-mono leading-relaxed italic">
                  &ldquo;Patient is a 54 year old male, came in with severe chest pain radiating to the left arm,
                  started about 2 hours ago, blood pressure 168/98, on metformin and lisinopril, 
                  allergic to penicillin...&rdquo;
                </p>
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}

            {/* Start button */}
            <button
              id="voice-start-btn"
              type="button"
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-[0_0_16px_rgba(13,148,136,0.3)] hover:scale-[1.01] active:scale-[0.99]"
            >
              <Mic className="h-5 w-5" />
              Start Voice Intake
            </button>

            <p className="text-[10px] text-text-muted text-center">
              Supported: Chrome · Edge · Safari &nbsp;|&nbsp; Microphone permission required
            </p>
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
            {/* Recording indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-60" />
                </div>
                <span className="text-xs font-bold text-red-400 tracking-widest uppercase">
                  Recording
                </span>
              </div>
              <span className="text-xs font-mono text-text-muted tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Live transcript */}
            <div className="min-h-[120px] max-h-[180px] overflow-y-auto p-4 rounded-xl bg-background border border-primary/20 text-sm leading-relaxed">
              {transcript ? (
                <span className="text-text-primary">{transcript}</span>
              ) : (
                <span className="text-text-muted italic text-xs">Start speaking...</span>
              )}
              {interimTranscript && (
                <span className="text-text-muted/60 italic"> {interimTranscript}</span>
              )}
            </div>

            {/* Confidence bar */}
            {confidence > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>Transcription confidence</span>
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

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                ⚠️ {error}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              <button
                id="voice-stop-btn"
                type="button"
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-all"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop & Parse
              </button>
              <button
                id="voice-add-btn"
                type="button"
                onClick={() => { stopListening(); handleAddMore(); }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border text-text-secondary font-semibold text-sm hover:text-text-primary hover:bg-surface-raised transition-all"
              >
                <Plus className="h-4 w-4" />
                Pause
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
            className="p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <h3 className="text-sm font-bold text-text-primary">⚙️ AI Parsing Clinical Data...</h3>
            </div>

            <div className="space-y-2.5">
              {['Receiving transcript', 'Extracting symptoms', 'Extracting medications', 'Checking red flags'].map(
                (stage) => {
                  const isDone = parsingStage !== stage && parsingStage > stage;
                  return (
                    <div key={stage} className="flex items-center gap-2.5 text-xs">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        parsingStage.includes(stage.split(' ')[1]) ? 'bg-primary animate-pulse' : 'bg-border'
                      }`} />
                      <span className={isDone ? 'text-text-primary' : 'text-text-muted'}>
                        {stage}
                      </span>
                      {isDone && <span className="text-emerald-400 ml-auto">✓</span>}
                    </div>
                  );
                }
              )}
            </div>

            {/* Animated progress bar */}
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-teal-400 rounded-full"
                initial={{ width: '5%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </div>

            <p className="text-xs text-text-muted text-center">
              Claude Haiku is extracting structured clinical data...
            </p>
          </motion.div>
        )}

        {/* ── STATE: COMPLETE ─────────────────────────────────────── */}
        {state === 'complete' && parseResult && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-400">Intake Complete</h3>
              <span className="ml-auto text-xs font-mono text-text-muted">
                {parseResult.extraction_confidence
                  ? `${Math.round(parseResult.extraction_confidence * 100)}% confidence`
                  : ''}
              </span>
            </div>

            {/* Field summary */}
            <div className="p-4 rounded-xl bg-background border border-border/60">
              <p className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wide">
                Fields Extracted ({parseResult.fields_extracted.length} found)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  ['patient_name', 'Name', parseResult.parsed_data?.patient_name as string],
                  ['patient_age', 'Age', parseResult.parsed_data?.patient_age as number > 0 ? String(parseResult.parsed_data.patient_age) : ''],
                  ['patient_gender', 'Gender', parseResult.parsed_data?.patient_gender as string],
                  ['chief_complaint', 'Complaint', parseResult.parsed_data?.chief_complaint as string ? '✓ filled' : ''],
                  ['symptoms', 'Symptoms', Array.isArray(parseResult.parsed_data?.symptoms) ? `${(parseResult.parsed_data.symptoms as unknown[]).length} found` : ''],
                  ['current_medications', 'Medications', Array.isArray(parseResult.parsed_data?.current_medications) ? `${(parseResult.parsed_data.current_medications as unknown[]).length} found` : ''],
                  ['medical_history', 'History', Array.isArray(parseResult.parsed_data?.medical_history) ? `${(parseResult.parsed_data.medical_history as unknown[]).length} found` : ''],
                  ['allergies', 'Allergies', Array.isArray(parseResult.parsed_data?.allergies) ? `${(parseResult.parsed_data.allergies as unknown[]).length} found` : ''],
                ].map(([key, label, value]) => {
                  const found = parseResult.fields_extracted.includes(key as string) || (value && String(value) !== '0');
                  return (
                    <div key={key as string} className="flex items-center gap-1.5 text-[11px]">
                      <span className={found ? 'text-emerald-400' : 'text-text-muted'}>
                        {found ? '✓' : '✗'}
                      </span>
                      <span className="text-text-secondary font-medium">{label as string}:</span>
                      <span className={`truncate ${found ? 'text-text-primary' : 'text-text-muted italic'}`}>
                        {found ? (value as string || 'found') : 'not found'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Vitals summary */}
              {parseResult.parsed_data?.vitals && typeof parseResult.parsed_data.vitals === 'object' && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide mb-1.5">Vitals</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parseResult.parsed_data.vitals as Record<string, unknown>).map(([k, v]) => 
                      v && v !== 0 ? (
                        <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                          {k}: {String(v)}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Red flag warning */}
            {parseResult.red_flags_detected && parseResult.parser_notes && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-400">CLINICAL RED FLAG DETECTED</p>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    {parseResult.parser_notes.replace(/⚠️\s*/g, '')}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {parseResult.parser_notes && !parseResult.red_flags_detected && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300/80">
                📋 {parseResult.parser_notes}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                id="voice-add-more-btn"
                type="button"
                onClick={handleAddMore}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-text-secondary font-semibold text-sm hover:text-text-primary hover:bg-surface-raised transition-all"
              >
                <Plus className="h-4 w-4" />
                Add More Voice
              </button>
              <button
                id="voice-accept-btn"
                type="button"
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(13,148,136,0.25)] hover:scale-[1.01]"
              >
                <CheckCircle className="h-4 w-4" />
                Accept & Fill Form
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full text-[10px] text-text-muted hover:text-text-secondary underline-offset-2 hover:underline transition-colors"
            >
              Start over
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
