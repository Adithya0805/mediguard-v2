'use client';

import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ label, size = 'md' }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };

  const iconMap = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 w-full h-full">
      {/* Outer Spinning Ring */}
      <div className="relative flex items-center justify-center">
        <div className={`rounded-full border-primary/20 border-t-primary animate-spin ${sizeMap[size]}`} />
        
        {/* Pulsing Clinical Heartbeat Icon in Center */}
        <div className="absolute inset-0 flex items-center justify-center text-primary/80 animate-pulse">
          <Activity className={`${iconMap[size]}`} />
        </div>
      </div>

      {/* Label Text */}
      {label && (
        <span className="text-sm font-sans font-medium text-text-secondary tracking-wide animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}
