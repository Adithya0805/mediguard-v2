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

const DEMO_CLINICAL_SESSIONS: (PatientSession & { urgency: UrgencyLevel })[] = [
  {
    id: 'demo-session-001',
    patient_name: 'Eleanor Vance',
    patient_age: 68,
    patient_gender: 'female',
    chief_complaint: 'Substernal chest pressure radiating to left arm, diaphoresis',
    symptoms: ['Chest pain', 'Diaphoresis', 'Shortness of breath'],
    medical_history: ['CAD', 'Hyperlipidemia'],
    current_medications: ['Atorvastatin', 'Aspirin'],
    allergies: ['Penicillin'],
    vitals: { bp: '148/92', heart_rate: 98, temperature: 98.6, spo2: 96 },
    status: 'completed',
    urgency: 'critical',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString()
  },
  {
    id: 'demo-session-002',
    patient_name: 'Marcus Sterling',
    patient_age: 54,
    patient_gender: 'male',
    chief_complaint: 'Refractory hypertension (BP 195/115), acute occipital headache',
    symptoms: ['Headache', 'Visual changes', 'Dizziness'],
    medical_history: ['Hypertension'],
    current_medications: ['Lisinopril'],
    allergies: [],
    vitals: { bp: '195/115', heart_rate: 88, temperature: 98.4, spo2: 98 },
    status: 'completed',
    urgency: 'high',
    created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString()
  },
  {
    id: 'demo-session-003',
    patient_name: 'Sophia Lin',
    patient_age: 31,
    patient_gender: 'female',
    chief_complaint: 'Productive cough, fever (102.4F), pleuritic chest discomfort',
    symptoms: ['Fever', 'Cough', 'Pleuritic pain'],
    medical_history: ['Asthma'],
    current_medications: ['Albuterol inhaler'],
    allergies: ['Sulfa drugs'],
    vitals: { bp: '118/76', heart_rate: 104, temperature: 102.4, spo2: 94 },
    status: 'completed',
    urgency: 'medium',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'demo-session-004',
    patient_name: 'Devon Brooks',
    patient_age: 72,
    patient_gender: 'male',
    chief_complaint: 'Post-syncopal episode with symptomatic sinus bradycardia',
    symptoms: ['Syncope', 'Lightheadedness', 'Fatigue'],
    medical_history: ['Atrial Fibrillation'],
    current_medications: ['Warfarin', 'Metoprolol'],
    allergies: [],
    vitals: { bp: '94/60', heart_rate: 42, temperature: 97.9, spo2: 95 },
    status: 'completed',
    urgency: 'critical',
    created_at: new Date(Date.now() - 1000 * 60 * 320).toISOString()
  },
  {
    id: 'demo-session-005',
    patient_name: 'Amara Okafor',
    patient_age: 44,
    patient_gender: 'female',
    chief_complaint: 'Polyuria, polydipsia, random blood glucose 380 mg/dL',
    symptoms: ['Polyuria', 'Polydipsia', 'Blurred vision'],
    medical_history: ['Gestational diabetes history'],
    current_medications: ['Metformin'],
    allergies: [],
    vitals: { bp: '132/84', heart_rate: 82, temperature: 98.6, spo2: 99 },
    status: 'completed',
    urgency: 'medium',
    created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString()
  }
];

export default function RecentSessions({ sessions }: RecentSessionsProps) {
  const router = useRouter();
  const isDemo = sessions.length === 0;
  const displaySessions = isDemo ? DEMO_CLINICAL_SESSIONS : sessions;

  const handleRowClick = (sessionId: string) => {
    router.push(`/patient/${sessionId}`);
  };

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 h-full text-left shadow-lg">
      
      {/* Card Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Recent Clinical Sessions</h3>
              {isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                  Intake Benchmarks
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted">Live patient triages and AI diagnostic orchestration logs</span>
          </div>
        </div>
        <Link 
          href="/sessions" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted hover:border-border/80 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          <span>View All Cases</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Sessions Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left font-sans">
          <thead>
            <tr className="border-b border-border/80 text-text-secondary text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Patient Name</th>
              <th className="py-3 px-4">Age / Gender</th>
              <th className="py-3 px-4">Chief Complaint</th>
              <th className="py-3 px-4">Urgency</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {displaySessions.map((s) => {
              let urgencyLevel: UrgencyLevel = 'medium';
              if ('urgency' in s && s.urgency) {
                urgencyLevel = s.urgency as UrgencyLevel;
              } else if (s.patient_name.includes('Kumar') || s.status === 'failed') {
                urgencyLevel = 'high';
              } else if (s.status === 'pending') {
                urgencyLevel = 'low';
              }
              
              const timestamp = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <tr
                  key={s.id}
                  onClick={() => handleRowClick(s.id)}
                  className="border-b border-border/40 hover:bg-surface-raised/60 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-bold text-text-primary group-hover:text-primary transition-colors">
                    {s.patient_name}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">
                    {s.patient_age}y / {s.patient_gender.charAt(0).toUpperCase()}
                  </td>
                  <td className="py-3.5 px-4 text-xs max-w-[280px] truncate text-text-secondary" title={s.chief_complaint}>
                    {s.chief_complaint}
                  </td>
                  <td className="py-3.5 px-4">
                    <UrgencyBadge urgency={urgencyLevel} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={s.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-text-muted">{timestamp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
