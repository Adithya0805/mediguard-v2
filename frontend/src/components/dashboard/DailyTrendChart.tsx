'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart
} from 'recharts';
import { AnalyticsDailyTrend } from '@/types';

interface DailyTrendChartProps {
  data: AnalyticsDailyTrend[];
}

export default function DailyTrendChart({ data }: DailyTrendChartProps) {
  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left shadow-lg w-full">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Daily Triage Activity</h3>
        <p className="text-xs text-text-muted">Stacked daily sessions by clinical urgency and average execution speed</p>
      </div>

      <div className="h-[300px] w-full mt-2 font-mono text-[10px]">
        {data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-text-muted">
            No session activity recorded for selected range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorMed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--border-rgb), 0.3)" />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)" 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                yAxisId="left"
                stroke="var(--text-muted)" 
                tickLine={false}
                axisLine={false}
                dx={-5}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#6366F1" 
                tickLine={false}
                axisLine={false}
                dx={5}
                unit="s"
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
                labelStyle={{ fontWeight: 'bold', color: '#FFF', marginBottom: '4px' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingBottom: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}
              />
              
              {/* Stacked Areas for session urgency levels */}
              <Area 
                yAxisId="left"
                type="monotone" 
                name="Critical"
                dataKey="critical" 
                stackId="1" 
                stroke="#EF4444" 
                fillOpacity={1} 
                fill="url(#colorCrit)" 
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                name="High"
                dataKey="high" 
                stackId="1" 
                stroke="#F59E0B" 
                fillOpacity={1} 
                fill="url(#colorHigh)" 
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                name="Medium"
                dataKey="medium" 
                stackId="1" 
                stroke="#10B981" 
                fillOpacity={1} 
                fill="url(#colorMed)" 
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                name="Low"
                dataKey="low" 
                stackId="1" 
                stroke="#3B82F6" 
                fillOpacity={1} 
                fill="url(#colorLow)" 
              />

              {/* Line for Average Pipeline Duration (right Y-axis) */}
              <Line
                yAxisId="right"
                type="monotone"
                name="Avg Speed"
                dataKey="avg_pipeline_seconds"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366F1', strokeWidth: 1, stroke: '#FFF' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
