'use client';

import React from 'react';
import { SessionStatus } from '@/types';
import { Clock, RefreshCw, CheckCircle, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  status: SessionStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase() as SessionStatus;

  const configMap: Record<SessionStatus, {
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    iconClass?: string;
  }> = {
    pending: {
      color: 'bg-slate-800/80 text-slate-300 border-slate-700',
      icon: Clock,
      label: 'Awaiting Analysis',
    },
    processing: {
      color: 'bg-teal-950/80 text-teal-300 border-teal-800',
      icon: RefreshCw,
      iconClass: 'animate-spin',
      label: 'AI Processing',
    },
    completed: {
      color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
      icon: CheckCircle,
      label: 'Complete',
    },
    failed: {
      color: 'bg-rose-950/80 text-rose-300 border-rose-800',
      icon: AlertOctagon,
      label: 'Failed',
    },
  };

  const current = configMap[normalized] || configMap.pending;
  const Icon = current.icon;

  const sizeClass = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px] gap-1 rounded' 
    : 'px-3 py-1 text-xs gap-1.5 rounded-full';

  return (
    <span className={`inline-flex items-center border font-sans font-medium ${current.color} ${sizeClass}`}>
      <Icon className={`h-3.5 w-3.5 ${current.iconClass || ''}`} />
      <span>{current.label}</span>
    </span>
  );
}
