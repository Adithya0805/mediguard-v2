'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  label: string;
  icon: LucideIcon;
  colorClass?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatsCard({
  title,
  value,
  label,
  icon: Icon,
  colorClass = 'text-primary bg-primary/10 border-primary/20',
  trend
}: StatsCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4 text-left shadow-lg hover:border-border/80 transition-colors">
      
      {/* Icon and Title */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{title}</span>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${colorClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      {/* Main Stats Value */}
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-sans font-bold text-text-primary tracking-tight">{value}</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-text-muted">{label}</span>
          
          {/* Subtle trend indicator */}
          {trend && (
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              trend.isPositive 
                ? 'bg-success/10 text-success border border-success/20' 
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}>
              {trend.value}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
