import React, { useState } from 'react';
import { 
  FileText, User, Mail, FileSignature, 
  Printer, Loader2, Download 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

interface PDFDownloadManagerProps {
  sessionId: string;
  onPrintClinical: () => void;
  onPrintPatient: () => void;
}

export default function PDFDownloadManager({ 
  sessionId, 
  onPrintClinical, 
  onPrintPatient 
}: PDFDownloadManagerProps) {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const downloadPDF = async (type: string) => {
    setLoadingType(type);
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(
        `/api/v1/report/${sessionId}/pdf/${type}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate ${type} PDF document.`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MediGuard_${type.charAt(0).toUpperCase() + type.slice(1)}_${sessionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} PDF downloaded successfully.`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Download failed. Please check permissions.');
    } finally {
      setLoadingType(null);
    }
  };

  const documentTypes = [
    {
      key: 'clinical',
      title: 'Clinical Report',
      icon: FileText,
      color: 'text-primary bg-primary/10 border-primary/20',
      description: 'Full physician report with differential diagnoses (DDx), drug analysis, agent meta logs, and audit trail.'
    },
    {
      key: 'patient',
      title: 'Patient Summary',
      icon: User,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      description: 'Plain English visit summary for the patient. Excludes confidence scores, ICD-10 codes, and technical jargon.'
    },
    {
      key: 'referral',
      title: 'Referral Letter',
      icon: Mail,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      description: 'Standard medical referral letter format to share clinical case narratives directly with specialist colleagues.'
    },
    {
      key: 'discharge',
      title: 'Discharge Summary',
      icon: FileSignature,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      description: 'Structured hospital discharge summary documenting treatment plans, active warnings, and follow-up directives.'
    }
  ];

  return (
    <div className="w-full rounded-2xl bg-[#111827] border border-border/80 shadow-xl p-6 text-left space-y-6 download-card">
      
      {/* Title */}
      <div>
        <h4 className="font-sans font-bold text-base text-text-primary">Download Clinical Documents</h4>
        <span className="text-xs text-text-secondary">Generate and stream HIPAA-audited PDF reports directly from memory.</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentTypes.map((doc) => {
          const Icon = doc.icon;
          const isLoading = loadingType === doc.key;
          
          return (
            <div 
              key={doc.key} 
              className="p-4 rounded-xl border border-border bg-[#1f2937]/15 flex flex-col justify-between gap-4 hover:border-border/60 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${doc.color}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">{doc.title}</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal">{doc.description}</p>
              </div>

              <button
                onClick={() => downloadPDF(doc.key)}
                disabled={loadingType !== null}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1f2937] hover:bg-[#1f2937]/80 text-text-secondary hover:text-text-primary text-xs font-bold transition-all border border-border/80 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="h-px bg-border/50" />

      {/* Local Web Print Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
          <Printer className="h-4 w-4" />
          <span>🖨️ Local Print Options</span>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onPrintClinical}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-surface hover:bg-surface-raised hover:text-text-primary text-text-secondary transition-colors"
          >
            Print Clinical Report
          </button>
          <button
            onClick={onPrintPatient}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-surface hover:bg-surface-raised hover:text-text-primary text-text-secondary transition-colors"
          >
            Print Patient Summary
          </button>
        </div>
      </div>

    </div>
  );
}
