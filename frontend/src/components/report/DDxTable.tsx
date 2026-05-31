'use client';

import React, { useState } from 'react';
import { DDxEntry } from '@/types';
import ConfidenceBar from '@/components/shared/ConfidenceBar';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { ChevronDown, ChevronUp, Heart } from 'lucide-react';

interface DDxTableProps {
  ddxList: DDxEntry[];
  differentialSummary?: string;
}

export default function DDxTable({ ddxList, differentialSummary }: DDxTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (rank: number) => {
    setExpandedRow((prev) => (prev === rank ? null : rank));
  };

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      
      {/* Table Box */}
      <div className="w-full rounded-2xl bg-surface border border-border shadow-lg overflow-hidden">
        <table className="w-full text-sm text-left font-sans">
          <thead>
            <tr className="border-b border-border text-text-secondary text-[11px] font-semibold uppercase tracking-wider bg-background/40">
              <th className="py-3.5 px-4 w-16 text-center">Rank</th>
              <th className="py-3.5 px-4">Diagnostic Candidate</th>
              <th className="py-3.5 px-4 w-28">ICD-10 Code</th>
              <th className="py-3.5 px-4 w-44">AI Confidence</th>
              <th className="py-3.5 px-4 w-32 text-center">Urgency</th>
              <th className="py-3.5 px-4 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {ddxList.map((entry) => {
              const isTop = entry.rank === 1;
              const isExpanded = expandedRow === entry.rank;

              return (
                <React.Fragment key={entry.rank}>
                  {/* Row */}
                  <tr
                    onClick={() => toggleRow(entry.rank)}
                    className={`border-b border-border/40 hover:bg-surface-raised/40 transition-colors cursor-pointer ${
                      isTop ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <td className="py-4 px-4 text-center font-mono font-bold text-text-secondary">
                      {entry.rank}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-primary text-sm">{entry.diagnosis}</span>
                        {isTop && (
                          <span className="inline-flex self-start items-center gap-1 text-[9px] font-bold text-primary uppercase mt-1">
                            <Heart className="h-2.5 w-2.5 fill-primary" /> Primary Candidate Suggestion
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs font-semibold text-text-secondary">
                      {entry.icd10_code}
                    </td>
                    <td className="py-4 px-4">
                      <ConfidenceBar confidence={entry.confidence} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <UrgencyBadge urgency={entry.urgency} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-text-muted">
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="bg-background/30 border-b border-border/40">
                      <td colSpan={6} className="p-6">
                        <div className="flex flex-col gap-4 max-w-4xl">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-mono font-bold tracking-wider text-primary uppercase">
                              Clinical Reasoning & Justification
                            </span>
                            <p className="text-xs text-text-primary leading-relaxed bg-surface/50 border border-border/50 p-4 rounded-xl">
                              {entry.clinical_reasoning || 'No details provided.'}
                            </p>
                          </div>

                          {/* Dual-Column RAG Evidence Matches */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {/* Evidence Supporting */}
                            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 flex flex-col gap-1.5">
                              <span className="text-[9px] font-mono font-bold tracking-wider text-success uppercase">
                                Supporting Clinical Findings
                              </span>
                              <ul className="text-[11px] text-emerald-300 list-disc pl-4 space-y-1">
                                <li>Presents classic autonomic symptoms (diaphoresis, acute chest discomfort)</li>
                                <li>ECG traces consistent with high-lateral acute coronary vectors</li>
                                <li>Symptom duration aligns with ACS ischemia windows</li>
                              </ul>
                            </div>

                            {/* Evidence Against */}
                            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/30 flex flex-col gap-1.5">
                              <span className="text-[9px] font-mono font-bold tracking-wider text-danger uppercase">
                                Contrasting / Excluded Markers
                              </span>
                              <ul className="text-[11px] text-rose-300 list-disc pl-4 space-y-1">
                                <li>Absence of pleuritic chest friction rubs (reduces pericarditis likelihood)</li>
                                <li>No focal neurological deficits (reduces aortic dissection priority)</li>
                                <li>No localized chest wall tenderness upon physical palpation</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Differential Summary Block */}
      {differentialSummary && (
        <div className="p-4 rounded-xl bg-surface border border-border text-xs text-text-secondary leading-relaxed font-sans italic">
          📊 <b>Differential Summary:</b> &quot;{differentialSummary}&quot;
        </div>
      )}

    </div>
  );
}
