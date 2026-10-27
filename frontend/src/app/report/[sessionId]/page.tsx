'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useReport } from '@/hooks/useReport';
import ReportViewer from '@/components/report/ReportViewer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { ReportSkeleton } from '@/components/shared/Skeletons';
import { PatientSession, ClinicalReportResponse } from '@/types';
import dynamic from 'next/dynamic';

const FHIRViewer = dynamic(
  () => import('@/components/report/FHIRViewer'),
  { loading: () => <LoadingSpinner size="md" label="Loading FHIR Schema Viewer..." />, ssr: false }
);

const PDFDownloadManager = dynamic(
  () => import('@/components/report/PDFDownloadManager'),
  { ssr: false }
);

const LiveAgentPipeline = dynamic(
  () => import('@/components/patient/LiveAgentPipeline'),
  { ssr: false }
);

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const isDemo = sessionId.startsWith('demo') || sessionId.startsWith('mock') || sessionId === 'test-session-1';

  const { session, isLoading: sessionLoading, error: sessionError } = useSession(sessionId);
  const { report, isLoading: reportLoading, error: reportError } = useReport(sessionId, session?.status);

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
    clinical_summary: '65-year-old male presenting with acute substernal crushing chest pressure radiating to left jaw. Dynamic ST segment elevation in leads V1-V4. Emergency percutaneous intervention successfully restored TIMI-3 myocardial perfusion.',
    urgency_level: 'critical',
    differential_diagnosis: [
      {
        rank: 1,
        diagnosis: 'Acute Coronary Syndrome (STEMI / NSTEMI)',
        icd10_code: 'I21.0',
        confidence: 0.94,
        urgency: 'critical',
        clinical_reasoning: 'Marked troponin elevation, radiating retrosternal distress, diaphoresis, and focal ST elevations.'
      },
      {
        rank: 2,
        diagnosis: 'Aortic Dissection (Type A/B)',
        icd10_code: 'I71.0',
        confidence: 0.22,
        urgency: 'critical',
        clinical_reasoning: 'Severe tearing chest pain excluded by bilateral radial pulse equality and bedside ultrasound.'
      },
      {
        rank: 3,
        diagnosis: 'Acute Pulmonary Embolism',
        icd10_code: 'I26.9',
        confidence: 0.18,
        urgency: 'high',
        clinical_reasoning: 'Dyspnea present but absence of calf asymmetry and normal right ventricular strain markers.'
      }
    ],
    recommended_tests: [
      'Serial 12-lead Electrocardiograms (Q15min)',
      'High-sensitivity Cardiac Troponin I (0h, 1h, 3h)',
      'Transthoracic Echocardiogram (TTE)',
      'Urgent Cardiac Catheterization / Coronary Angiography'
    ],
    drug_interactions_found: [
      {
        drug_a: 'Aspirin',
        drug_b: 'Ticagrelor',
        severity: 'moderate',
        management: 'Dual antiplatelet therapy indicated post-ACS. Monitor for signs of gastrointestinal hemorrhage; co-prescribe PPI if ulcer risk elevated.',
        fda_cited: true,
        fda_source: 'OpenFDA Drug Safety Alerts 2024'
      }
    ],
    report_pdf_url: null,
    fhir_bundle: {
      resourceType: 'Bundle',
      type: 'document',
      total: 3
    },
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
    return <ReportSkeleton />;
  }

  if (error || !effectiveSession || !effectiveReport) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-2xl bg-surface border border-danger/20 text-center my-12">
        <div className="text-danger font-bold text-lg">Failed to Retrieve Report Documents</div>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {error || 'Clinical report document has not been enqueued or analysis is still pending.'}
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => router.push(`/patient/${sessionId}`)}
            className="px-5 py-2.5 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all text-sm font-semibold animate-pulse"
          >
            Check Case Tracker status
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition-all text-sm font-semibold"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full">
        <ReportViewer 
          report={effectiveReport} 
          session={effectiveSession} 
          FHIRViewer={FHIRViewer}
          PDFDownloadManager={PDFDownloadManager}
          LiveAgentPipeline={LiveAgentPipeline}
        />
      </div>
    </ErrorBoundary>
  );
}
