'use client';

import React from 'react';
import { AnalyticsDiagnosisFrequency } from '@/types';
import { Stethoscope, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DiagnosisPatternChartProps {
  data: AnalyticsDiagnosisFrequency[];
}

export default function DiagnosisPatternChart({ data }: DiagnosisPatternChartProps) {
  const maxCases = Math.max(...data.map(d => d.count), 1);
  const totalCases = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between gap-6 text-left shadow-lg w-full h-full">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-bold text-text-primary tracking-tight">Clinical Diagnostic Patterns</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {totalCases} cases cataloged
          </span>
        </div>
        <p className="text-xs text-text-muted">Top primary diagnoses mapped to AI confidence, ICD-10 taxonomy, and urgency rates</p>
      </div>

      {data.length === 0 ? (
        <div className="h-[220px] w-full flex items-center justify-center text-text-muted text-xs">
          No diagnostic activity recorded
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 w-full">
          {data.slice(0, 4).map((item) => {
            const confDisplay = item.avg_confidence > 1 
              ? Math.round(item.avg_confidence) 
              : Math.round(item.avg_confidence * 100);
            const percentage = Math.round((item.count / maxCases) * 100);
            const isHighConfidence = confDisplay >= 85;

            return (
              <div 
                key={item.diagnosis}
                className="flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-surface-muted/40 hover:bg-surface-muted/70 hover:border-border/90 transition-all text-left"
              >
                {/* Header row: Icon + Diagnosis + ICD-10 + Urgency */}
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg border border-primary/20 bg-primary/10 text-primary shrink-0">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-text-primary leading-tight">
                      {item.diagnosis}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface border border-border/80 font-mono text-text-secondary">
                      {item.icd10_code || 'N/A'}
                    </span>
                    {item.high_urgency_percent > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-danger/10 text-danger border border-danger/25">
                        <ShieldAlert className="h-3 w-3" />
                        {Math.round(item.high_urgency_percent)}% urgent
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual frequency progress bar */}
                <div className="w-full bg-surface-raised rounded-full h-2 overflow-hidden border border-border/40 mt-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHighConfidence 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Footer metrics row */}
                <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
                  <span className="font-mono font-semibold text-text-primary">
                    {item.count} cases <span className="text-text-muted font-normal">({Math.round((item.count / totalCases) * 100)}% of intake)</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <span>AI Confidence: <strong className="text-text-primary">{confDisplay}%</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
