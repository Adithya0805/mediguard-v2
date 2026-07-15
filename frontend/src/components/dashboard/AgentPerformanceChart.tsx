'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { AnalyticsAgentPerformance } from '@/types';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface AgentPerformanceChartProps {
  data: AnalyticsAgentPerformance[];
}

export default function AgentPerformanceChart({ data }: AgentPerformanceChartProps) {
  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left shadow-lg w-full">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Agent Pipeline Benchmarks</h3>
        <p className="text-xs text-text-muted">Orchestrator pipeline speed analysis and LLM token usage averages</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        {/* Recharts Bar Display */}
        <div className="lg:col-span-3 h-[250px] w-full font-mono text-[10px]">
          {data.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-text-muted">
              No agent performance data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--border-rgb), 0.3)" />
                <XAxis 
                  dataKey="display_name" 
                  stroke="var(--text-muted)" 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  tickLine={false}
                  axisLine={false}
                  unit="s"
                  dx={-5}
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
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    paddingBottom: '20px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                />
                <Bar 
                  name="Avg Duration" 
                  dataKey="avg_seconds" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  name="Max Duration" 
                  dataKey="max_seconds" 
                  fill="#F59E0B" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Detailed Health Status Table */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Agent Health Indicators</span>
          <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
            {data.map((agent) => {
              const isHealthy = agent.status === 'healthy';
              const isWarning = agent.status === 'warning';
              
              let StatusIcon = ShieldCheck;
              let statusBg = 'bg-success/10 border-success/20 text-success';
              if (isWarning) {
                StatusIcon = Shield;
                statusBg = 'bg-warning/10 border-warning/20 text-warning';
              } else if (agent.status === 'critical') {
                StatusIcon = ShieldAlert;
                statusBg = 'bg-danger/10 border-danger/20 text-danger-hover';
              }

              return (
                <div 
                  key={agent.agent_name}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-muted hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${statusBg}`}>
                      <StatusIcon className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-text-primary leading-tight">{agent.display_name}</span>
                      <span className="text-[10px] text-text-muted font-mono">{agent.avg_tokens.toLocaleString()} tokens/avg</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right">
                    <span className="text-xs font-mono font-bold text-text-primary">{agent.success_rate}% success</span>
                    <span className="text-[10px] text-text-muted font-mono">avg {agent.avg_seconds}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
