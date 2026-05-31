'use client';

import React from 'react';
import { UrgencyLevel } from '@/types';
import { AlertCircle } from 'lucide-react';

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  size?: 'sm' | 'md' | 'lg';
}

export default function UrgencyBadge({ urgency, size = 'md' }: UrgencyBadgeProps) {
  const level = urgency.toLowerCase() as UrgencyLevel;

  const colorMap = {
    critical: 'bg-[#dc2626] text-white border-[#b91c1c] shadow-[0_0_10px_rgba(220,38,38,0.4)]',
    high: 'bg-[#d97706] text-white border-[#b45309]',
    medium: 'bg-[#ca8a04] text-white border-[#a16207]',
    low: 'bg-[#059669] text-white border-[#047857]',
  };

  const sizeMap = {
    sm: 'px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded border',
    md: 'px-3 py-1 text-xs font-mono font-bold tracking-wider rounded-full border gap-1.5',
    lg: 'px-4 py-1.5 text-sm font-mono font-bold tracking-wider rounded-full border gap-2',
  };

  const isCritical = level === 'critical';

  return (
    <span className={`inline-flex items-center justify-center font-mono font-bold uppercase ${colorMap[level] || colorMap.medium} ${sizeMap[size]} ${
      isCritical ? 'critical-pulse-badge' : ''
    }`}>
      {isCritical && <AlertCircle className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {level}
    </span>
  );
}
