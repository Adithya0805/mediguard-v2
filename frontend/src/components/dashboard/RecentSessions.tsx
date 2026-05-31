'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PatientSession, UrgencyLevel } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { ClipboardList, ArrowUpRight } from 'lucide-react';

interface RecentSessionsProps {
  sessions: PatientSession[];
}

export default function RecentSessions({ sessions }: RecentSessionsProps) {
  const router = useRouter();

  const handleRowClick = (sessionId: string) => {
    router.push(`/patient/${sessionId}`);
  };

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 h-full text-left shadow-lg">
      
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Recent Clinical Sessions</h3>
        </div>
        <Link 
          href="/sessions" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          <span>View All Cases</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Sessions Table */}
      <div className="overflow-x-auto w-full">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted gap-2">
            <ClipboardList className="h-10 w-10 text-border" />
            <span className="text-sm font-semibold">No recent sessions registered</span>
            <p className="text-xs max-w-xs leading-relaxed">
              Use the intake wizard to launch clinical pipeline runs for new patients.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left font-sans">
            <thead>
              <tr className="border-b border-border/80 text-text-secondary text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Chief Complaint</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                // Mock urgency fallback logic based on name/status if reports are standalone
                let mockUrgency = 'medium';
                if (s.patient_name.includes('Kumar') || s.status === 'failed') {
                  mockUrgency = 'high';
                } else if (s.status === 'pending') {
                  mockUrgency = 'low';
                }
                
                // Format relative time or standard formatted string
                const timestamp = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr
                    key={s.id}
                    onClick={() => handleRowClick(s.id)}
                    className="border-b border-border/40 hover:bg-surface-raised/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-text-primary">{s.patient_name}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">
                      {s.patient_age}y / {s.patient_gender.charAt(0).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 text-xs max-w-[180px] truncate text-text-secondary" title={s.chief_complaint}>
                      {s.chief_complaint}
                    </td>
                    <td className="py-3.5 px-4">
                      <UrgencyBadge urgency={mockUrgency as UrgencyLevel} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">{timestamp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
