'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ConfidenceBarProps {
  confidence: number; // Decimal format e.g. 0.87 or percentage format e.g. 87
  showText?: boolean;
}

export default function ConfidenceBar({ confidence, showText = true }: ConfidenceBarProps) {
  // Normalize value to a percentage (0 to 100)
  const normalized = confidence <= 1.0 ? confidence * 100 : confidence;
  const pct = Math.min(100, Math.max(0, Math.round(normalized)));

  // Color mapping based on score levels
  let color = 'bg-danger shadow-[0_0_6px_#ef4444]';
  let textColor = 'text-danger';
  if (pct >= 75) {
    color = 'bg-success shadow-[0_0_6px_#10b981]';
    textColor = 'text-success';
  } else if (pct >= 50) {
    color = 'bg-warning shadow-[0_0_6px_#f59e0b]';
    textColor = 'text-warning';
  }

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Outer Progress Bar Container */}
      <div className="h-2 w-full rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden">
        {/* Animated Inner Progress Bar */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>

      {/* Numerical Percentage Readout */}
      {showText && (
        <span className={`text-xs font-mono font-bold whitespace-nowrap ${textColor}`}>
          {pct}%
        </span>
      )}
    </div>
  );
}
