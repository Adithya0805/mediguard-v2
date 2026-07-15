'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { AnalyticsDiagnosisFrequency } from '@/types';
import { Stethoscope, ShieldAlert } from 'lucide-react';

interface DiagnosisPatternChartProps {
  data: AnalyticsDiagnosisFrequency[];
}

export default function DiagnosisPatternChart({ data }: DiagnosisPatternChartProps) {
  // Take top 5 for bar visualization, show top 10 in list
  const chartData = data.slice(0, 5);

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left shadow-lg w-full">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Clinical Diagnostic Patterns</h3>
        <p className="text-xs text-text-muted">Top primary diagnoses mapped to average agent confidence and urgency rates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        {/* Horizontal Bar Chart (frequency) */}
        <div className="lg:col-span-3 h-[250px] w-full font-mono text-[10px]">
          {data.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-text-muted">
              No diagnostic activity recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              >
                <XAxis 
                  type="number"
                  stroke="var(--text-muted)" 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="diagnosis" 
                  stroke="var(--text-primary)" 
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 15)}...` : val}
                />
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
                  labelStyle={{ fontWeight: 'bold', color: '#FFF' }}
                />
                <Bar 
                  name="Cases" 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry, index) => {
                    // Harmonious colors based on confidence level
                    const conf = entry.avg_confidence;
                    let fill = '#3B82F6'; // Blue
                    if (conf >= 0.85) fill = '#10B981'; // Emerald
                    else if (conf < 0.75) fill = '#F59E0B'; // Amber
                    
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Detailed Codes & Urgency List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Top Diagnoses Detail</span>
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
            {data.map((item, idx) => (
              <div 
                key={item.diagnosis}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-muted hover:border-border/80 transition-colors"
              >
                <div className="flex items-start gap-2.5 max-w-[70%]">
                  <div className="p-1.5 rounded-lg border border-primary/20 bg-primary/10 text-primary mt-0.5">
                    <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-text-primary leading-tight truncate max-w-[150px]" title={item.diagnosis}>
                      {item.diagnosis}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">{item.icd10_code || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-mono font-bold text-text-primary">{item.count} cases</span>
                  <div className="flex items-center gap-1 text-[10px] text-text-muted">
                    {item.high_urgency_percent > 0 && (
                      <span className="flex items-center text-danger font-bold gap-0.5">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {Math.round(item.high_urgency_percent)}%
                      </span>
                    )}
                    <span className="font-mono">conf: {Math.round(item.avg_confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
