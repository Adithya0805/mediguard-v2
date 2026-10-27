'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AudioWaveVisualizerProps {
  isRecording: boolean;
  isSimulating?: boolean;
}

export default function AudioWaveVisualizer({ isRecording, isSimulating = false }: AudioWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [hasMicStream, setHasMicStream] = useState(false);

  useEffect(() => {
    let active = true;

    if (isRecording && !isSimulating) {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then((stream) => {
            if (!active) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              audioContextRef.current = ctx;
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 64;
              analyser.smoothingTimeConstant = 0.8;
              analyserRef.current = analyser;

              const source = ctx.createMediaStreamSource(stream);
              source.connect(analyser);
              setHasMicStream(true);
            }
          })
          .catch(() => {
            setHasMicStream(false);
          });
      }
    } else {
      setHasMicStream(false);
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isSimulating]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 32;
      const barWidth = Math.floor(width / numBars) - 2;

      if (isRecording && hasMicStream && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        for (let i = 0; i < numBars; i++) {
          const rawVal = dataArray[i % dataArray.length] || 0;
          const normalized = rawVal / 255;
          const barHeight = Math.max(4, normalized * (height - 6));

          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#0d9488');
          gradient.addColorStop(0.5, '#2dd4bf');
          gradient.addColorStop(1, '#0f766e');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else if (isRecording || isSimulating) {
        // Organic simulated waveform
        phase += 0.08;
        for (let i = 0; i < numBars; i++) {
          const sine = Math.sin(phase + i * 0.35);
          const cos = Math.cos(phase * 0.8 + i * 0.2);
          const normalized = (Math.abs(sine * 0.6 + cos * 0.4) + 0.15) * (isSimulating ? 0.9 : 0.6);
          const barHeight = Math.max(4, normalized * (height - 6));

          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          if (isSimulating) {
            gradient.addColorStop(0, '#38bdf8');
            gradient.addColorStop(0.5, '#818cf8');
            gradient.addColorStop(1, '#6366f1');
          } else {
            gradient.addColorStop(0, '#f43f5e');
            gradient.addColorStop(0.5, '#fb7185');
            gradient.addColorStop(1, '#e11d48');
          }

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else {
        // Idle gentle pulse
        for (let i = 0; i < numBars; i++) {
          const barHeight = 4;
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isSimulating, hasMicStream]);

  return (
    <div className="w-full flex flex-col items-center gap-2 py-2">
      <div className="relative w-full max-w-md h-16 rounded-xl bg-background/80 border border-border/80 flex items-center justify-center px-4 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={360}
          height={56}
          className="w-full h-full"
        />
        {isRecording && (
          <div className="absolute top-1.5 right-2.5 flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-semibold">
              {hasMicStream ? 'LIVE AUDIO' : isSimulating ? 'DICTATION STREAM' : 'LISTENING'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
