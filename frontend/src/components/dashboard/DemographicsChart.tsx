'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { AnalyticsDemographics } from '@/types';

interface DemographicsChartProps {
  data: AnalyticsDemographics;
}

export default function DemographicsChart({ data }: DemographicsChartProps) {
  const { age_groups, gender_split, avg_age } = data;

  const ageData = [
    { range: '0-18', count: age_groups['0-18'] },
    { range: '19-35', count: age_groups['19-35'] },
    { range: '36-50', count: age_groups['36-50'] },
    { range: '51-65', count: age_groups['51-65'] },
    { range: '65+', count: age_groups['65+'] }
  ];

  const genderData = [
    { name: 'Male', value: gender_split.male, color: '#3B82F6' },
    { name: 'Female', value: gender_split.female, color: '#EC4899' },
    { name: 'Other', value: gender_split.other, color: '#8B5CF6' }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between gap-5 text-left shadow-lg w-full">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Patient Demographics</h3>
        <p className="text-xs text-text-muted">Admissions by clinical gender profiles and age brackets</p>
      </div>

      <div className="flex flex-col gap-5 w-full">
        {/* Gender Donut Chart + Central Avg Age */}
        <div className="h-[140px] w-full flex items-center justify-center relative font-mono text-[10px]">
          {genderData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-text-muted">
              No demographic data recorded
            </div>
          ) : (
            <div className="flex items-center justify-around w-full">
              {/* Donut with Central Avg Age */}
              <div className="relative h-[130px] w-[130px] flex items-center justify-center shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        color: '#F8FAFC'
                      }}
                      itemStyle={{ color: '#E2E8F0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Central text displaying average age */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-sans font-extrabold text-text-primary leading-none">{avg_age || 'N/A'}</span>
                  <span className="text-[8px] uppercase tracking-wider text-text-muted font-sans font-bold mt-0.5">Avg Age</span>
                </div>
              </div>

              {/* Legend Stack */}
              <div className="flex flex-col gap-2 font-sans text-xs">
                {genderData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-text-secondary capitalize font-medium">{item.name}:</span>
                    <span className="text-text-primary font-bold font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50 w-full" />

        {/* Age Groups Bar Chart */}
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Age Distribution</span>
          <div className="h-[120px] w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ageData}
                margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis 
                  dataKey="range" 
                  stroke="var(--text-muted)" 
                  tickLine={false}
                  axisLine={false}
                  dy={4}
                  fontSize={10}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  tickLine={false}
                  axisLine={false}
                  dx={-2}
                  fontSize={10}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#F8FAFC'
                  }}
                  itemStyle={{ color: '#E2E8F0' }}
                  labelStyle={{ fontWeight: 'bold', color: '#FFF' }}
                />
                <Bar 
                  name="Patients" 
                  dataKey="count" 
                  fill="#0d9488" 
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
