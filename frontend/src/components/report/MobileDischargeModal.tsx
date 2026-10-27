'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Smartphone, 
  Share2, 
  MessageSquare, 
  Mail, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  Heart,
  Pill,
  Clock,
  AlertTriangle
} from 'lucide-react';
import QRCodeCard from '@/components/shared/QRCodeCard';
import { PatientSession, ClinicalReportResponse, PatientDischargeSummary } from '@/types';
import { toast } from 'sonner';

interface MobileDischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PatientSession;
  report: ClinicalReportResponse;
}

export default function MobileDischargeModal({
  isOpen,
  onClose,
  session,
  report
}: MobileDischargeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mediguard-v2.vercel.app';
  const dischargeUrl = `${origin}/discharge/${session.id}`;

  const primary = report.differential_diagnosis?.[0] || {
    diagnosis: session.chief_complaint || 'Clinical Evaluation',
    icd10_code: 'R07.9'
  };

  const discharge: Partial<PatientDischargeSummary> = report.patient_discharge_summary || {};

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(dischargeUrl);
      setCopied(true);
      toast.success('Mobile care pass link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello ${session.patient_name}, here is your confidential digital discharge plan and medication schedule from MediGuard Medical Center: ${dischargeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Discharge Instructions & Care Guide - ${session.patient_name}`);
    const body = encodeURIComponent(
      `Dear ${session.patient_name},\n\nPlease review your personalized post-discharge instructions, warning signs, and medication guidelines here:\n${dischargeUrl}\n\nEmergency care: Dial 911 immediately if you experience severe chest pain, shortness of breath, or sudden weakness.\n\nMediGuard Medical Center`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden z-10 my-auto text-left"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-surface-raised border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_10px_rgba(13,148,136,0.25)]">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Mobile Patient Discharge Handover</h3>
                <p className="text-xs text-text-muted">Instant QR Code & smartphone companion for {session.patient_name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start max-h-[80vh] overflow-y-auto">
            
            {/* Left Column: QR Code & Handover Actions (5 cols) */}
            <div className="md:col-span-5 space-y-5">
              <QRCodeCard
                url={dischargeUrl}
                title="Scan Patient Care Pass"
                subtitle="Patients or caregivers can point their smartphone camera to instantly access plain-language guidance."
              />

              {/* Direct Sharing Channels */}
              <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-3">
                <span className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider block">
                  Direct Caregiver Handover
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 font-semibold transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEmail}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 font-semibold transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Patient</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>HIPAA-compliant read-only tokenization</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Mobile Mockup Preview (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                <span>📱 Live Smartphone Preview</span>
                <a
                  href={dischargeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Open Fullscreen</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Phone Device Frame */}
              <div className="mx-auto w-full max-w-sm rounded-[32px] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl overflow-hidden relative">
                
                {/* Notch */}
                <div className="mx-auto h-4 w-24 rounded-full bg-slate-800 mb-2 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-700 mr-2" />
                  <div className="h-1 w-6 rounded-full bg-slate-700" />
                </div>

                {/* Simulated Screen View */}
                <div className="h-[460px] overflow-y-auto rounded-[20px] bg-background p-4 space-y-3 text-xs border border-border/60">
                  
                  {/* Top hospital bar */}
                  <div className="flex items-center justify-between border-b border-border/80 pb-2">
                    <span className="font-mono text-[10px] text-primary font-bold">MEDIGUARD CARE PASS</span>
                    <span className="text-[9px] text-text-muted">MRN #{session.id.slice(0, 6).toUpperCase()}</span>
                  </div>

                  {/* Patient Name */}
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <h4 className="font-bold text-text-primary text-sm">{session.patient_name}</h4>
                    <p className="text-[10px] text-text-muted">{session.patient_age} y/o {session.patient_gender}</p>
                  </div>

                  {/* Emergency 911 Banner */}
                  <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-between">
                    <div className="text-[10px] text-red-300 font-bold">Emergency Alert: Dial 911</div>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-red-600 text-white font-bold">STAT</span>
                  </div>

                  {/* Diagnosis */}
                  <div className="p-3 rounded-xl bg-surface border border-primary/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase">
                      <Heart className="h-3 w-3" /> Diagnosis
                    </div>
                    <p className="font-bold text-text-primary text-xs">{primary.diagnosis}</p>
                    <p className="text-[10px] text-text-muted line-clamp-2">
                      {discharge.core_condition_explained || 'Review your symptoms and treatment guidance.'}
                    </p>
                  </div>

                  {/* Meds */}
                  <div className="p-3 rounded-xl bg-surface border border-border space-y-1.5">
                    <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase">
                      <Pill className="h-3 w-3" /> Prescribed Medications
                    </div>
                    {(session.current_medications?.slice(0, 3) || ['Aspirin 81mg', 'Atorvastatin 40mg']).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-background border border-border text-[10px]">
                        <span className="font-medium text-text-primary">{m}</span>
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                    ))}
                  </div>

                  {/* Warning signs */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="h-3 w-3 text-amber-400" /> Warning Signs:
                    </div>
                    <p className="text-[9px] text-amber-200/80">Chest pain spreading to arm or jaw, shortness of breath, sudden numbness.</p>
                  </div>

                </div>

                {/* Home Indicator */}
                <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-slate-700" />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-surface-raised border-t border-border flex items-center justify-between text-xs">
            <span className="text-text-muted font-mono text-[11px]">
              Ready for immediate clinical handover
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary font-semibold transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
