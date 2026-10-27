'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useReport } from '@/hooks/useReport';
import { ReportSkeleton } from '@/components/shared/Skeletons';
import { 
  PhoneCall, 
  ShieldAlert, 
  Heart, 
  Pill, 
  Calendar, 
  Home, 
  CheckCircle2, 
  Share2, 
  Printer, 
  ArrowLeft,
  Activity,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { PatientDischargeSummary, PatientSession, ClinicalReportResponse } from '@/types';

export default function MobileDischargePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const isDemo = sessionId.startsWith('demo') || sessionId.startsWith('mock') || sessionId === 'test-session-1';

  const { session, isLoading: sessionLoading, error: sessionError } = useSession(sessionId);
  const { report, isLoading: reportLoading, error: reportError } = useReport(sessionId, session?.status);

  const [checkedMeds, setCheckedMeds] = useState<Record<string, boolean>>({});

  const demoSessionFallback: PatientSession = {
    id: sessionId,
    patient_name: 'Robert Vance',
    patient_age: 65,
    patient_gender: 'Male',
    chief_complaint: 'Substernal crushing chest pain radiating to left jaw and shoulder',
    symptoms: ['Chest Pain', 'Radiation To Left Arm', 'Diaphoresis', 'Shortness Of Breath'],
    medical_history: ['Hypertension', 'Hyperlipidemia'],
    current_medications: ['Aspirin 81mg OD', 'Ticagrelor 90mg BD', 'Metoprolol 25mg BD', 'Atorvastatin 80mg QHS'],
    allergies: ['Penicillin'],
    vitals: {
      bp: '154/92',
      heart_rate: 88,
      temperature: 37.1,
      spo2: 96,
      weight: 82,
      height: 175
    },
    status: 'completed',
    created_at: new Date().toISOString()
  };

  const demoReportFallback: ClinicalReportResponse = {
    id: `rep-${sessionId}`,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    clinical_summary: '65-year-old male evaluated for acute substernal chest pressure with dynamic ST elevation. Hemodynamically stable post-reperfusion.',
    urgency_level: 'high',
    differential_diagnosis: [
      {
        rank: 1,
        diagnosis: 'Acute Coronary Syndrome (STEMI / NSTEMI)',
        icd10_code: 'I21.0',
        confidence: 0.94,
        urgency: 'critical',
        clinical_reasoning: 'Marked troponin elevation, radiating retrosternal distress, diaphoresis.'
      }
    ],
    recommended_tests: ['Serial 12-lead ECG', 'High-sensitivity Troponin I at 1h and 3h', 'Transthoracic Echocardiogram'],
    drug_interactions_found: [],
    report_pdf_url: null,
    fhir_bundle: null,
    reviewed_by_agent: 'ReportAgent-v2',
    patient_discharge_summary: {
      core_condition_explained: 'You were evaluated and treated for an Acute Coronary Syndrome event. Blood flow to a segment of heart muscle was temporarily reduced. Your heart rhythm and vital signs are now stable, and your recovery care plan is outlined below.',
      warning_signs_immediate_er: [
        'Sudden, severe chest pressure or squeezing that lasts more than 5 minutes',
        'Pain spreading to the left jaw, neck, back, or left arm',
        'Shortness of breath accompanied by cold sweating or dizziness',
        'Sudden fainting, severe palpitation, or heart racing above 120 bpm'
      ],
      home_care_instructions: [
        'Strict rest for 48 hours; avoid heavy lifting (over 10 lbs) and vigorous physical exertion.',
        'Record morning and evening blood pressure and pulse in your personal recovery log.',
        'Follow a low-sodium, heart-healthy dietary plan; stay hydrated with plain water.',
        'Do not drive a motor vehicle until cleared by your attending cardiologist at follow-up.'
      ],
      follow_up_timeline: 'Cardiology Outpatient Clinic within 48 to 72 hours for serial telemetry review and stress echocardiogram scheduling.',
      medication_guidance: 'Take your dual antiplatelet therapy (Aspirin + Ticagrelor) strictly as prescribed without skipping doses. Never stop blood thinners abruptly.'
    }
  };

  const effectiveSession = session || (isDemo ? demoSessionFallback : null);
  const effectiveReport = report || (isDemo ? demoReportFallback : null);

  const isLoading = (sessionLoading || reportLoading) && !effectiveSession;
  const error = (!effectiveSession || !effectiveReport) ? (sessionError || reportError) : null;

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <ReportSkeleton />
      </div>
    );
  }

  if (error || !effectiveSession || !effectiveReport) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-2xl bg-surface border border-border text-center my-8 space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
        <h3 className="font-bold text-text-primary text-base">Discharge Plan Unavailable</h3>
        <p className="text-xs text-text-muted leading-relaxed">
          {error || 'The clinical report is still being finalized by the care team.'}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/patient/${sessionId}`)}
          className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs"
        >
          View Case Status
        </button>
      </div>
    );
  }

  const primary = effectiveReport.differential_diagnosis?.[0] || {
    diagnosis: effectiveSession.chief_complaint || 'Clinical Evaluation',
    icd10_code: 'R07.9'
  };

  const discharge: Partial<PatientDischargeSummary> = effectiveReport.patient_discharge_summary || {};

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `Discharge Plan - ${effectiveSession.patient_name}`,
        text: `Medical Discharge & Care Guide for ${effectiveSession.patient_name}`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Discharge link copied to clipboard!');
    }
  };

  const toggleMed = (med: string) => {
    setCheckedMeds((prev) => ({ ...prev, [med]: !prev[med] }));
  };

  return (
    <div className="min-h-screen bg-background text-text-primary pb-16 font-sans">
      
      {/* Mobile Top Navigation */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border/80 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={() => router.push(`/report/${sessionId}`)}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Full Report</span>
        </button>
        <span className="text-[11px] font-mono font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
          PATIENT CARE PASS
        </span>
        <button
          type="button"
          onClick={handleShare}
          className="p-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        
        {/* Hospital Card */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider block">
              MediGuard Medical Center
            </span>
            <h2 className="text-base font-bold text-text-primary">{effectiveSession.patient_name}</h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {effectiveSession.patient_age} y/o {effectiveSession.patient_gender} · MRN #{sessionId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
            Rx
          </div>
        </div>

        {/* Emergency Call Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/20 via-rose-500/15 to-surface border border-red-500/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Emergency Hotlines</span>
            </div>
            <a
              href="tel:911"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Call 911</span>
            </a>
          </div>
          <p className="text-[11px] text-red-200/90 leading-relaxed">
            If you experience crushing chest pain, sudden numbness, or severe difficulty breathing, dial 911 or visit the nearest ER immediately.
          </p>
        </div>

        {/* Primary Condition Explained */}
        <div className="p-5 rounded-2xl bg-surface border border-primary/20 shadow-md space-y-2.5">
          <div className="flex items-center gap-2 text-primary">
            <Heart className="h-4 w-4" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Your Diagnosis</span>
          </div>
          <h3 className="text-base font-bold text-text-primary">{primary.diagnosis}</h3>
          <p className="text-xs text-text-secondary leading-relaxed bg-background/50 p-3.5 rounded-xl border border-border/60">
            {discharge.core_condition_explained ||
              `You have been evaluated for ${primary.diagnosis}. Our clinical team reviewed your symptoms, electrocardiogram, and biomarkers to build your safe recovery roadmap.`}
          </p>
        </div>

        {/* Warning Signs (When to return) */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-md space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Red Flag Warning Signs</span>
          </div>
          <div className="space-y-2">
            {(discharge.warning_signs_immediate_er || [
              'Chest tightness or pain spreading to jaw, neck, or left arm',
              'Shortness of breath while resting or speaking',
              'Dizziness, lightheadedness, or feeling faint',
              'Unusual bruising, epistaxis, or bleeding gums'
            ]).map((warning: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90">
                <span className="text-amber-400 font-bold shrink-0">⚠️</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Medication Checklist */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Pill className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Medication Schedule</span>
            </div>
            <span className="text-[10px] text-text-muted">Tap to check off</span>
          </div>

          <div className="space-y-2">
            {(effectiveSession.current_medications && effectiveSession.current_medications.length > 0
              ? effectiveSession.current_medications
              : ['Aspirin 81mg Daily', 'Atorvastatin 40mg at Bedtime', 'Metoprolol 25mg Twice Daily']
            ).map((med: string, i: number) => {
              const isChecked = Boolean(checkedMeds[med]);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleMed(med)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isChecked
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-background border-border text-text-primary hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border'
                    }`}>
                      {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-xs font-semibold ${isChecked ? 'line-through opacity-70' : ''}`}>
                      {med}
                    </span>
                  </div>
                  <Clock className="h-3.5 w-3.5 text-text-muted" />
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-text-muted italic pt-1">
            {discharge.medication_guidance ||
              'Never stop or change medication doses without consulting your physician.'}
          </p>
        </div>

        {/* Home Care & Lifestyle */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-md space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Home className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Daily Recovery Guidelines</span>
          </div>
          <ul className="space-y-2 text-xs text-text-secondary">
            {(discharge.home_care_instructions || [
              'Rest quietly and avoid strenuous physical exertion or heavy lifting for 48 hours.',
              'Record blood pressure and heart rate twice daily (morning and evening).',
              'Follow a low-sodium, heart-healthy dietary plan with adequate hydration.',
              'Do not operate machinery or drive if experiencing dizziness or sedation.'
            ]).map((instruction: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Follow-up Timeline */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-md space-y-2.5">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Follow-Up Schedule</span>
          </div>
          <p className="text-xs text-text-primary leading-relaxed bg-background/50 p-3 rounded-xl border border-border/60">
            {discharge.follow_up_timeline ||
              'Please schedule a follow-up appointment with your primary care provider within 48 to 72 hours.'}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl bg-surface border border-border text-text-primary font-bold hover:bg-surface-raised transition-all flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" />
            <span>Print Patient Copy</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(13,148,136,0.25)]"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Guide</span>
          </button>
        </div>

      </main>
    </div>
  );
}
