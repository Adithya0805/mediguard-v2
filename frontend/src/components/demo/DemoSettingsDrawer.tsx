'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, HardDrive, Database, FileText, UserRound, Layers, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getDemoStorageStats,
  clearDemoData,
  formatDemoBytes,
  DemoStorageStats,
} from '@/lib/demoStorage';

interface DemoSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onDataCleared: () => void;
}

const EMPTY_STATS: DemoStorageStats = {
  available: true,
  totalBytes: 0,
  stores: {
    demoPatients: { count: 0, bytes: 0 },
    demoReports: { count: 0, bytes: 0 },
    demoSession: { count: 0, bytes: 0 },
  },
};

const STORE_ROWS = [
  { key: 'demoPatients', label: 'Demo Patient Records', icon: UserRound, color: 'text-[#0d9488]' },
  { key: 'demoReports', label: 'Generated Reports', icon: FileText, color: 'text-[#06b6d4]' },
  { key: 'demoSession', label: 'Session State', icon: Layers, color: 'text-[#94a3b8]' },
] as const;

export default function DemoSettingsDrawer({ open, onClose, onDataCleared }: DemoSettingsDrawerProps) {
  const [stats, setStats] = useState<DemoStorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    const next = await getDemoStorageStats();
    setStats(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setShowConfirm(false);
      refreshStats();
    }
  }, [open, refreshStats]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleClear = async () => {
    if (isClearing) return;
    setIsClearing(true);
    const ok = await clearDemoData();
    setIsClearing(false);
    setShowConfirm(false);
    if (ok) {
      setStats({ ...EMPTY_STATS, available: stats?.available ?? true });
      toast.success('Demo data cleared. You are back to a fresh demo state.');
      onDataCleared();
    } else {
      toast.error('Could not clear demo data. Browser storage may be unavailable.');
    }
  };

  if (!open) return null;

  const storageUnavailable = stats === null ? false : !stats.available;
  const totalLabel = formatDemoBytes(stats?.totalBytes ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#0a0f1e]/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-[#1e293b] bg-[#111827] shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e293b]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0d9488]/10 border border-[#0d9488]/25 text-[#0d9488]">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-white tracking-tight">Demo Mode Settings</h2>
              <p className="text-[11px] text-[#94a3b8] font-mono">Everything stays on this device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b]/70 transition-colors focus:outline-none"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Local Storage panel */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-[#06b6d4]" />
                <h3 className="text-sm font-bold text-white tracking-tight">Local Storage</h3>
              </div>
              <button
                onClick={refreshStats}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b]/70 transition-colors focus:outline-none disabled:opacity-50"
                aria-label="Refresh storage stats"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {storageUnavailable ? (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#d97706]/10 border border-[#d97706]/25 text-[#fbbf24]">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Browser storage unavailable</span>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    IndexedDB is not accessible in this browser session (private browsing, blocked storage, or the
                    browser cleared its data). The demo still works, but nothing is saved and data will not survive a
                    refresh.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Total data */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0f1e]/60 border border-[#1e293b]">
                  <span className="text-xs text-[#94a3b8] font-semibold uppercase tracking-wider">Total Data Stored</span>
                  <span className="text-lg font-mono font-bold text-[#0d9488]">
                    {isLoading ? '...' : totalLabel}
                  </span>
                </div>

                {/* Record counts by type */}
                <div className="flex flex-col divide-y divide-[#1e293b]/60 rounded-xl bg-[#0a0f1e]/40 border border-[#1e293b] overflow-hidden">
                  {STORE_ROWS.map((row) => {
                    const Icon = row.icon;
                    const usage = stats?.stores[row.key];
                    return (
                      <div key={row.key} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${row.color}`} />
                          <span className="text-xs text-[#94a3b8] font-medium">{row.label}</span>
                        </div>
                        <span className="font-mono text-xs text-white font-bold">
                          {isLoading ? '...' : `${usage?.count ?? 0} record${usage?.count === 1 ? '' : 's'}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-[#475569] leading-relaxed">
                  Demo data is scoped to the <span className="font-mono text-[#94a3b8]">mediguard-demo</span> database
                  on this browser only. Clearing browser storage/cache also removes it — this is expected.
                </p>

                {/* Clear button + confirmation */}
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={isClearing}
                    className="w-full px-4 py-3 rounded-xl bg-[#dc2626]/15 border border-[#dc2626]/30 text-[#f87171] hover:bg-[#dc2626]/25 hover:text-red-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors focus:outline-none disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Demo Data
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-[#dc2626]/10 border border-[#dc2626]/30 flex flex-col gap-3">
                    <p className="text-xs text-[#f1f5f9] leading-relaxed">
                      Are you sure? This will permanently delete all locally stored demo records, reports and session
                      state from this browser.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isClearing}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e293b] hover:bg-[#2a3a52] text-[#94a3b8] hover:text-white text-xs font-semibold transition-colors focus:outline-none disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClear}
                        disabled={isClearing}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#ef4444] text-white text-xs font-bold transition-colors focus:outline-none disabled:opacity-50"
                      >
                        {isClearing ? 'Clearing...' : 'Yes, Clear Data'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Demo data privacy note */}
          <section className="flex flex-col gap-2 p-4 rounded-xl bg-[#0a0f1e]/50 border border-[#1e293b]/70">
            <h4 className="text-[10px] font-mono font-bold text-[#06b6d4] uppercase tracking-wider">Privacy</h4>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              No demo data is ever sent to or stored on MediGuard servers. The pipeline output is generated on the
              backend but only the result you see is kept locally in your browser.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
