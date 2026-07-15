'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { AnalyticsAnomaly } from '@/types';

interface AnomalyAlertBannerProps {
  anomalies: AnalyticsAnomaly[];
}

export default function AnomalyAlertBanner({ anomalies }: AnomalyAlertBannerProps) {
  const [dismissedTypes, setDismissedTypes] = useState<string[]>([]);

  const activeAnomalies = anomalies.filter(
    (anomaly) => !dismissedTypes.includes(anomaly.type)
  );

  if (activeAnomalies.length === 0) return null;

  const handleDismiss = (type: string) => {
    setDismissedTypes((prev) => [...prev, type]);
  };

  return (
    <div className="flex flex-col gap-3 w-full mb-6">
      <AnimatePresence>
        {activeAnomalies.map((anomaly) => {
          const isCritical = anomaly.severity === 'critical';
          const Icon = isCritical ? ShieldAlert : AlertTriangle;
          const bgClass = isCritical
            ? 'bg-danger/10 border-danger/30 text-danger-hover'
            : 'bg-warning/10 border-warning/30 text-warning-hover';

          return (
            <motion.div
              key={anomaly.type}
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 shadow-sm backdrop-blur-sm ${bgClass}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isCritical ? 'bg-danger/20' : 'bg-warning/20'}`}>
                  <Icon className="h-5 w-5 shrink-0" />
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-sm font-semibold tracking-tight uppercase font-sans">
                    {isCritical ? 'Critical Pipeline Anomaly' : 'System Bottleneck Warning'}
                  </span>
                  <span className="text-xs text-text-primary opacity-90 leading-relaxed font-sans font-medium">
                    {anomaly.message}
                  </span>
                  <span className="text-[10px] opacity-60 font-mono mt-1">
                    Detected at: {new Date(anomaly.detected_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => handleDismiss(anomaly.type)}
                className="p-1 rounded-md hover:bg-black/5 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                title="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
