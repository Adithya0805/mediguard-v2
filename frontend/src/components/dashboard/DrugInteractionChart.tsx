'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { AnalyticsDrugInteractions } from '@/types';
import { AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface DrugInteractionChartProps {
  data: AnalyticsDrugInteractions;
}

export default function DrugInteractionChart({ data }: DrugInteractionChartProps) {
  const { total_interactions_detected, by_severity, most_common_pairs } = data;

  const severityData = [
    { name: 'Contraindicated', value: by_severity.contraindicated, color: '#EF4444' },
    { name: 'Severe', value: by_severity.severe, color: '#F59E0B' },
    { name: 'Moderate', value: by_severity.moderate, color: '#FBBF24' },
    { name: 'Mild', value: by_severity.mild, color: '#6366F1' }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left shadow-lg w-full">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Drug Interaction Screenings</h3>
        <p className="text-xs text-text-muted">Pharmaceutical safety profile aggregates and critical combination alerts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        {/* Pie / Donut Breakdown */}
        <div className="lg:col-span-2 h-[250px] w-full flex flex-col items-center justify-center relative font-mono text-[10px]">
          {severityData.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-text-muted gap-2">
              <Sparkles className="h-6 w-6 text-success opacity-80" />
              <span>Zero interactions flagged!</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      backdropFilter: 'blur(8px)',
                      color: '#F8FAFC'
                    }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Central text displaying total */}
              <div className="absolute flex flex-col items-center justify-center dy-1 mt-[-10px]">
                <span className="text-2xl font-sans font-bold text-text-primary">{total_interactions_detected}</span>
                <span className="text-[9px] uppercase tracking-wider text-text-muted font-sans font-semibold">Warnings</span>
              </div>
            </>
          )}
        </div>

        {/* Legend + Critical warning list */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Dangerous Drug Combinations</span>
            <div className="flex flex-col gap-2.5 max-h-[190px] overflow-y-auto pr-1">
              {most_common_pairs.length === 0 ? (
                <div className="text-xs text-text-muted italic py-6 text-center">
                  No critical interactions flagged in session records.
                </div>
              ) : (
                most_common_pairs.map((pair, idx) => {
                  const isContraindicated = pair.severity === 'contraindicated';
                  const isSevere = pair.severity === 'severe';
                  
                  let badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                  if (isContraindicated) {
                    badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse';
                  } else if (isSevere) {
                    badgeColor = 'bg-orange-500/15 text-orange-400 border-orange-500/25';
                  } else if (pair.severity === 'moderate') {
                    badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                  }

                  return (
                    <div 
                      key={`${pair.drug_a}-${pair.drug_b}-${idx}`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-muted hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 max-w-[70%]">
                        <div className={`p-1.5 rounded-lg border ${isContraindicated ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-surface border-border text-text-muted'}`}>
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-text-primary capitalize leading-tight">
                            {pair.drug_a} + {pair.drug_b}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">{pair.count} records flagged</span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                        {pair.severity}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
