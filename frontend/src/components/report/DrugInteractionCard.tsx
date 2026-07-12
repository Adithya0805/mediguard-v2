'use client';

import React from 'react';
import { DrugInteraction } from '@/types';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface DrugInteractionCardProps {
  interactions: DrugInteraction[];
  allergies?: string[];
  contraindications?: string[];
  medicationNotes?: string;
  fda_data_used?: boolean;
}

export default function DrugInteractionCard({
  interactions,
  allergies = [],
  contraindications = [],
  medicationNotes,
  fda_data_used = false
}: DrugInteractionCardProps) {
  
  // Sort interactions: contraindicated -> severe -> moderate -> mild
  const severityWeights = {
    contraindicated: 4,
    severe: 3,
    moderate: 2,
    mild: 1
  };

  const sortedInteractions = [...interactions].sort((a, b) => {
    const wA = severityWeights[a.severity] || 0;
    const wB = severityWeights[b.severity] || 0;
    return wB - wA;
  });

  const severityColorMap = {
    contraindicated: 'bg-red-950/60 text-red-400 border-red-900',
    severe: 'bg-rose-950/60 text-rose-400 border-rose-900',
    moderate: 'bg-amber-950/60 text-amber-400 border-amber-900',
    mild: 'bg-emerald-950/60 text-emerald-400 border-emerald-900',
  };

  const hasAlerts = sortedInteractions.length > 0 || allergies.length > 0 || contraindications.length > 0;

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      
      {/* FDA Data Info Banner */}
      {fda_data_used && (
        <div className="p-3 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-400 font-semibold flex items-center gap-2">
          <span>ⓘ Drug interactions verified against FDA drug label database</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          NO INTERACTIONS FOUND: GREEN SAFE BANNER
          ───────────────────────────────────────────────────────────────────────────── */}
      {!hasAlerts ? (
        <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 flex items-center gap-4 shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="h-11 w-11 rounded-full bg-success/10 border border-success/20 text-success flex items-center justify-center">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-text-primary">Medications Safe & Mapped</h4>
            <span className="text-xs text-text-secondary leading-relaxed">
              No significant drug-drug interactions or active drug-allergy contraindications were identified for the current medications checklist.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Medication Notes */}
          {medicationNotes && (
            <div className="p-4 rounded-xl bg-surface border border-border text-xs text-text-secondary leading-relaxed leading-6 font-sans italic">
              💊 <b>Pharmacist Advisory Notes:</b> &quot;{medicationNotes}&quot;
            </div>
          )}

          {/* Allergy warnings */}
          {allergies.length > 0 && (
            <div className="p-5 rounded-2xl bg-red-950/20 border border-red-900/30 flex flex-col gap-3">
               <div className="flex items-center gap-2 text-xs font-mono font-bold text-danger uppercase tracking-wider">
                <AlertTriangle className="h-4.5 w-4.5 text-danger animate-pulse" />
                <span>Drug-Allergy Conflict Hazard</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Active prescriptions overlap with the patient&apos;s verified allergy profile:
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {allergies.map((allergen, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-danger/10 border border-danger/25 text-xs font-mono font-bold text-danger">
                    ⚠ Conflict detected: Penicillin Allergen ↔ {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contraindications Warning Box */}
          {contraindications.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-danger uppercase tracking-wider">
                <ShieldAlert className="h-4.5 w-4.5 text-danger" />
                <span>Critical Pathological Contraindications</span>
              </div>
              <div className="flex flex-col gap-1.5 pl-4 list-disc text-xs text-text-secondary">
                {contraindications.map((contra, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-danger">
                    • <span className="font-semibold">{contra}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactions List */}
          {sortedInteractions.length > 0 && (
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border pb-2">
                Drug-Drug Interactions Mapped
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedInteractions.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-5 rounded-2xl bg-surface border border-border flex flex-col gap-4 shadow-md hover:border-primary/20 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-2">
                      <span className="text-xs font-mono font-extrabold text-text-primary">
                        {item.drug_a} ↔ {item.drug_b}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.fda_cited ? (
                          <span className="px-2 py-0.5 rounded text-[8px] font-mono font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            📋 FDA Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[8px] font-mono font-extrabold bg-slate-800 text-text-muted border border-border">
                            AI Analysis
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                          severityColorMap[item.severity] || severityColorMap.mild
                        }`}>
                          {item.severity}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono font-bold uppercase text-text-secondary">Pathology Mechanism</span>
                        <p className="text-xs text-text-primary leading-relaxed">
                          {item.mechanism || 'Competitive pharmacokinetics increase drug serum exposure ratios.'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono font-bold uppercase text-text-secondary">Clinical Management Guidance</span>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {item.management}
                        </p>
                      </div>
                      {item.fda_cited && item.fda_source && (
                        <div className="text-[9px] text-text-secondary/70 mt-1 italic font-sans">
                          Source: {item.fda_source}
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
