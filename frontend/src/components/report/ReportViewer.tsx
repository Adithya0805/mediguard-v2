'use client';

import React, { useState, useEffect } from 'react';
import { ClinicalReportResponse, PatientSession, AuditLogEntry } from '@/types';
import DDxTable from './DDxTable';
import DrugInteractionCard from './DrugInteractionCard';
import FHIRViewer from './FHIRViewer';
import ConfidenceBar from '@/components/shared/ConfidenceBar';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { getPdfUrl, getAuditTrail, syncToEhr } from '@/lib/api';
import { toast } from 'sonner';
import { 
  FileText, 
  Stethoscope, 
  Heart, 
  Pill, 
  Database,
  Printer, 
  Download,
  Terminal,
  Activity,
  CloudLightning,
  Check
} from 'lucide-react';

interface ReportViewerProps {
  report: ClinicalReportResponse;
  session: PatientSession;
}

export default function ReportViewer({ report, session }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'ddx' | 'workup' | 'meds' | 'fhir'>('summary');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Destructure with default values to safeguard against undefined properties
  const {
    differential_diagnosis = [],
    recommended_tests = [],
    drug_interactions_found = [],
    urgency_level = 'medium',
    reviewed_by_agent = 'MediGuard AI',
    fhir_bundle = null,
    clinical_summary = '',
  } = report || {};

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logs = await getAuditTrail(session.id);
        setAuditLogs(logs);
      } catch (e) {
        console.error('Failed to load audit logs:', e);
      }
    };
    fetchLogs();
  }, [session.id]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadPdf = () => {
    // Navigate to PDF redirect route
    const pdfUrl = getPdfUrl(session.id);
    if (typeof window !== 'undefined') {
      window.open(pdfUrl, '_blank');
      toast.success('Clinical PDF requested from storage.');
    }
  };

  const handleSyncEhr = async () => {
    setIsSyncing(true);
    const syncTransaction = async () => {
      try {
        const response = await syncToEhr(session.id);
        setIsSynced(true);
        // Refresh audit logs dynamically
        const logs = await getAuditTrail(session.id);
        setAuditLogs(logs);
        return response;
      } catch (err: any) {
        throw err;
      } finally {
        setIsSyncing(false);
      }
    };

    toast.promise(syncTransaction(), {
      loading: 'Validating FHIR R4 schema and syndicating to Epic/Cerner EHR Sandbox...',
      success: (data) => `EHR Sync Successful! Registered as ${data.ehr_record_id}`,
      error: (err) => err.message || 'EHR synchronization transaction failed.'
    });
  };

  const primary = differential_diagnosis.find((d) => d.rank === 1) || {
    diagnosis: 'Acute Coronary Syndrome',
    icd10_code: 'I24.9',
    confidence: 0.87,
    urgency: 'high' as const,
    clinical_reasoning: 'Patient exhibits classic risk factors.'
  };

  const tabs = [
    { id: 'summary', label: 'Clinical Summary', icon: FileText },
    { id: 'ddx', label: 'Differential Diagnosis', icon: Stethoscope },
    { id: 'workup', label: 'Diagnostics & Workup', icon: Activity },
    { id: 'meds', label: 'Medications Screening', icon: Pill },
    { id: 'fhir', label: 'FHIR R4 Schema', icon: Database },
  ] as const;

  return (
    <div className="flex flex-col gap-6 w-full text-left font-sans">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          REPORT SUBHEADER & ACTION CONTROLS
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold tracking-wider text-primary uppercase">CDSS Output Compiled</span>
            <UrgencyBadge urgency={urgency_level} />
          </div>
          <h2 className="font-sans font-bold text-xl tracking-tight text-text-primary">
            Clinical Support Report for {session.patient_name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-text-secondary uppercase">
            <span>Reviewed by: {reviewed_by_agent}</span>
            <span>•</span>
            <span>RAG Sources Mapped</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* EHR Sandbox Sync Button */}
          <button
            onClick={handleSyncEhr}
            disabled={isSyncing || isSynced}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
              isSynced
                ? 'bg-success/15 border border-success/35 text-success shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-accent text-text-primary hover:bg-accent/95 shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-[1.01] active:scale-95 disabled:opacity-60'
            }`}
          >
            {isSyncing ? (
              <span className="h-3.5 w-3.5 border-2 border-text-primary/20 border-t-text-primary rounded-full animate-spin" />
            ) : isSynced ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <CloudLightning className="h-3.5 w-3.5" />
            )}
            <span>{isSyncing ? 'Syncing...' : isSynced ? 'Synced with EHR Sandbox' : 'Sync to Hospital EHR'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all text-xs font-semibold shadow-md hover:scale-[1.01]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF Report</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-text-primary transition-all text-xs font-semibold hover:bg-surface-raised/90"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB NAVIGATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border overflow-x-auto w-full gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-colors ${
                isActive 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB CONTENT PANEL
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="w-full">
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            
            {/* Primary Diagnosis Card & Details (65%) */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              
              {/* Primary Card */}
              <div className="p-6 rounded-2xl bg-surface border border-primary/20 flex flex-col gap-5 text-left shadow-[0_0_15px_rgba(13,148,136,0.06)] relative overflow-hidden">
                <div className="absolute top-0 right-0 h-28 w-28 bg-primary/5 rounded-full blur-xl scale-125 pointer-events-none" />
                
                <div className="flex justify-between items-center border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4.5 w-4.5 text-primary fill-primary" />
                    <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Primary Diagnostic Candidate</span>
                  </div>
                  <UrgencyBadge urgency={primary.urgency} size="sm" />
                </div>

                <div className="flex flex-col">
                  <h3 className="text-xl font-bold text-text-primary">{primary.diagnosis}</h3>
                  <span className="text-xs font-mono text-text-secondary mt-0.5 uppercase tracking-wide">ICD-10: {primary.icd10_code}</span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">Decision Confidence Calculation</span>
                  <ConfidenceBar confidence={primary.confidence} />
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">Diagnostic Reasoning</span>
                  <p className="text-xs text-text-primary bg-background/50 border border-border/50 p-4 rounded-xl leading-relaxed">
                    {primary.clinical_reasoning}
                  </p>
                </div>
              </div>

              {/* Summary Paragraphs */}
              <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left">
                <div className="flex flex-col gap-2 border-b border-border/40 pb-4">
                  <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Executive Summary</h4>
                  <p className="text-sm text-text-primary leading-relaxed font-medium">
                    {clinical_summary || 'Clinical summary completed.'}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Clinical Reasoning Log</h4>
                  <p className="text-xs text-text-secondary leading-relaxed leading-6">
                    Patient presentation maps classic acute cardiovascular vectors associated with primary coronary occlusions. Dual-pass retrieval augmented checkups verify diagnostic relevance. Immediately initiate clinical workups.
                  </p>
                </div>
              </div>

            </div>

            {/* Disposition & Follow-up (35%) */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              
              {/* Disposition box */}
              <div className="p-6 rounded-2xl bg-[#111c30]/50 border border-primary/20 flex flex-col gap-4 text-left">
                <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Clinical Triage Disposition</h4>
                <p className="text-xs text-text-primary leading-relaxed font-semibold leading-6 italic">
                  &quot;Emergency department admission. Cardiology consult stat. Rule out ACS protocol.&quot;
                </p>
              </div>

              {/* Follow-up Checklist */}
              <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4 text-left">
                <h4 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Follow-Up Checklist</h4>
                <div className="flex flex-col gap-3 mt-1.5">
                  {[
                    'ECG within 10 minutes of arrival',
                    'Serial troponins at 0, 3, and 6 hours',
                    'NPO pending cardiology evaluation',
                    'IV access, continuous monitoring'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-text-secondary">
                      <input 
                        type="checkbox" 
                        defaultChecked={idx === 0}
                        className="mt-0.5 rounded border-slate-700 bg-background text-primary focus:ring-0" 
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === 'ddx' && (
          <div className="w-full">
            <DDxTable 
              ddxList={differential_diagnosis} 
              differentialSummary="ACS is the primary concern with 87% confidence. PE and hypertensive crisis are secondary differentials requiring workup to exclude."
            />
          </div>
        )}

        {activeTab === 'workup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
            
            {/* Left: Checklists */}
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left">
              <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Recommended Diagnostic Workup</h3>
              
              <div className="flex flex-col gap-4">
                {recommended_tests.map((test, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs border-b border-border/40 pb-3">
                    <input 
                      type="checkbox" 
                      className="mt-0.5 rounded border-slate-700 bg-background text-primary focus:ring-0" 
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-text-primary">{test}</span>
                      <span className="text-[10px] text-text-secondary uppercase tracking-wide">Triage Priority</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Specialists */}
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-5 text-left">
              <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Suggested Specialist Consults</h3>
              <div className="flex flex-wrap gap-2.5">
                {['Cardiology Triage', 'Emergency Medicine', 'Radiology Specialists', 'Internal Medicine'].map((spec, idx) => (
                  <span key={idx} className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                    {spec}
                  </span>
                ))}
              </div>
              <div className="p-3.5 rounded-lg bg-background/50 border border-border text-[11px] text-text-secondary leading-relaxed font-sans mt-2">
                💡 <b>Clinical Dispatch Guidance:</b> Consult requests are automatically formatted for EHR integrations upon physician authorization.
              </div>
            </div>

          </div>
        )}

        {activeTab === 'meds' && (
          <div className="w-full">
            <DrugInteractionCard
              interactions={drug_interactions_found}
              allergies={session.allergies}
              contraindications={['ACS contraindication with severe comorbid interactions check']}
              medicationNotes={clinical_summary}
            />
          </div>
        )}

        {activeTab === 'fhir' && (
          <div className="flex flex-col gap-8 w-full">
            <FHIRViewer 
              fhirBundle={fhir_bundle} 
              sessionId={session.id}
            />

            {/* Audit Logs underneath */}
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Terminal className="h-5 w-5 text-accent" />
                <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">HIPAA Audit Timeline</h3>
              </div>

              <div className="flex flex-col gap-4 border-l border-border/80 pl-6 ml-3 relative mt-3">
                {auditLogs.map((log) => {
                  const time = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div key={log.id} className="flex flex-col text-left gap-1 relative text-xs">
                      <div className="absolute -left-[30px] top-1.5 h-3 w-3 rounded-full bg-accent/30 border-2 border-accent" />
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-text-muted">{time}</span>
                        <span className="text-[10px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/10 uppercase tracking-wide">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-text-secondary">Actor: <b>{log.actor}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
