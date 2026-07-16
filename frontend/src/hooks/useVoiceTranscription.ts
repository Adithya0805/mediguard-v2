'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export interface VoiceTranscriptionState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  error: string | null;
  duration: number;
}

export interface UseVoiceTranscriptionReturn extends VoiceTranscriptionState {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  appendMode: boolean;
  setAppendMode: (v: boolean) => void;
}

export function useVoiceTranscription(): UseVoiceTranscriptionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [appendMode, setAppendMode] = useState(true);

  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isListeningRef = useRef(false); // Ref to avoid stale closure in onend

  // Check browser support once on mount
  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
    }
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  const startDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    setError(null);

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English accent optimized
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalText += text;
          const conf = result[0].confidence;
          if (conf > 0) setConfidence(Math.round(conf * 100));
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript((prev) => {
          const prefix = appendMode && prev ? prev + ' ' : '';
          return (prefix + finalText).trim();
        });
        // Start timer on first speech result
        if (duration === 0) {
          startDurationTimer();
        }
      }

      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error;
      let msg: string;
      switch (code) {
        case 'not-allowed':
          msg = 'Microphone access denied. Please allow microphone access in your browser settings.';
          break;
        case 'no-speech':
          msg = 'No speech detected. Try speaking closer to the microphone.';
          break;
        case 'network':
          msg = 'Network error during transcription. Please check your connection.';
          break;
        case 'audio-capture':
          msg = 'No microphone found on this device.';
          break;
        case 'service-not-allowed':
          msg = 'Speech recognition service not allowed. Ensure HTTPS or localhost.';
          break;
        default:
          msg = 'Voice recognition error. Please try again.';
      }
      setError(msg);
      // Only stop fully on critical errors — no-speech may auto-restart
      if (code === 'not-allowed' || code === 'audio-capture' || code === 'service-not-allowed') {
        isListeningRef.current = false;
        setIsListening(false);
        stopDurationTimer();
      }
    };

    recognition.onend = () => {
      setInterimTranscript('');
      // Auto-restart if we were not manually stopped
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (_) {
          // Ignore if already started
        }
      }
    };

    recognition.onstart = () => {
      // Timer starts on first speech result, not on start
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setIsListening(true);
    startDurationTimer();

    try {
      recognition.start();
    } catch (e) {
      setError('Failed to start voice recognition. Please try again.');
      setIsListening(false);
      isListeningRef.current = false;
      stopDurationTimer();
    }
  }, [isSupported, appendMode, duration, startDurationTimer, stopDurationTimer]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    stopDurationTimer();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
  }, [stopDurationTimer]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setDuration(0);
    setError(null);
    stopDurationTimer();
  }, [stopDurationTimer]);

  return {
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
  };
}
