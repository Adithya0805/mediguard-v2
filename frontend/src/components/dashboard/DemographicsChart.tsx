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
import { User } from 'lucide-react';

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
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left shadow-lg w-full">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Patient Demographics</h3>
        <p className="text-xs text-text-muted">Breakdown of intake admissions by patient age range and clinical gender profiles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        {/* Age Groups Bar Chart */}
        <div className="lg:col-span-3 h-[220px] w-full font-mono text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ageData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--border-rgb), 0.3)" />
              <XAxis 
                dataKey="range" 
                stroke="var(--text-muted)" 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="var(--text-muted)" 
                tickLine={false}
                axisLine={false}
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
              <Bar 
                name="Patients" 
                dataKey="count" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Donut Chart + Avg Age */}
        <div className="lg:col-span-2 h-[220px] w-full flex flex-col items-center justify-center relative font-mono text-[10px]">
          {genderData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-text-muted">
              No demographic data recorded
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
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
                      backdropFilter: 'blur(8px)',
                      color: '#F8FAFC'
                    }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Central text displaying average age */}
              <div className="absolute flex flex-col items-center justify-center dy-1 mt-[-10px]">
                <span className="text-xl font-sans font-bold text-text-primary">{avg_age || 'N/A'}</span>
                <span className="text-[9px] uppercase tracking-wider text-text-muted font-sans font-semibold">Avg Age</span>
              </div>
              
              {/* Custom Legend */}
              <div className="flex gap-4 justify-center mt-2 font-sans font-semibold text-[10px]">
                {genderData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-text-primary capitalize">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
