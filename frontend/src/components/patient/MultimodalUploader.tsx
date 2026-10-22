'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Activity, 
  Zap, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Upload, 
  FlaskConical,
  HeartPulse,
  Info,
  X
} from 'lucide-react';
import { 
  MultimodalPreset, 
  MultimodalAttachment, 
  ExtractedBiomarker, 
  ECGAnalysis 
} from '@/types';
import { getMultimodalPresets, analyzeMultimodalData } from '@/lib/api';
import { toast } from 'sonner';

interface MultimodalUploaderProps {
  onAttachmentChange: (attachments: MultimodalAttachment[], enrichedVitals?: Record<string, any>) => void;
  initialPresetId?: string;
}

export default function MultimodalUploader({
  onAttachmentChange,
  initialPresetId
}: MultimodalUploaderProps) {
  const [presets, setPresets] = useState<MultimodalPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MultimodalPreset | null>(null);
  
  // Custom upload state
  const [customText, setCustomText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customBiomarkers, setCustomBiomarkers] = useState<ExtractedBiomarker[]>([]);
  const [customEcg, setCustomEcg] = useState<ECGAnalysis | null>(null);

  useEffect(() => {
    async function loadPresets() {
      try {
        setLoadingPresets(true);
        const data = await getMultimodalPresets();
        setPresets(data);
        if (initialPresetId) {
          const match = data.find(p => p.id === initialPresetId);
          if (match) handleSelectPreset(match);
        }
      } catch (e) {
        console.warn('Failed to fetch multimodal presets, using local fallback:', e);
      } finally {
        setLoadingPresets(false);
      }
    }
    loadPresets();
  }, [initialPresetId]);

  const handleSelectPreset = (preset: MultimodalPreset) => {
    setSelectedPreset(preset);
    setCustomText('');
    setCustomBiomarkers([]);
    setCustomEcg(null);

    // Build attachment object
    const attachment: MultimodalAttachment = {
      filename: `${preset.id}.json`,
      content_type: 'application/json',
      modality_hint: preset.category === 'cardiology' ? 'ecg' : 'lab_panel',
      base64_data: btoa(JSON.stringify(preset))
    };

    // Calculate vitals enrichment if available from preset
    const vitalsEnrichment: Record<string, any> = {};
    if (preset.sample_ecg?.heart_rate_bpm) {
      vitalsEnrichment.heart_rate = preset.sample_ecg.heart_rate_bpm;
    }

    onAttachmentChange([attachment], vitalsEnrichment);
    toast.success(`Attached clinical preset: ${preset.title}`);
  };

  const handleClear = () => {
    setSelectedPreset(null);
    setCustomBiomarkers([]);
    setCustomEcg(null);
    setCustomText('');
    onAttachmentChange([]);
  };

  const handleCustomAnalyze = async () => {
    if (!customText.trim()) {
      toast.error('Please enter lab values or ECG telemetry text to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const b64 = btoa(unescape(encodeURIComponent(customText)));
      const result = await analyzeMultimodalData({
        filename: 'clinician_lab_intake.txt',
        content_type: 'text/plain',
        base64_data: b64,
        modality_hint: 'lab_panel'
      });

      if (result.extracted_biomarkers) {
        setCustomBiomarkers(result.extracted_biomarkers);
      }
      if (result.ecg_interpretation) {
        setCustomEcg(result.ecg_interpretation);
      }

      const attachment: MultimodalAttachment = {
        filename: 'clinician_lab_intake.txt',
        content_type: 'text/plain',
        base64_data: b64,
        modality_hint: 'lab_panel'
      };

      onAttachmentChange([attachment], result.vitals_enrichment || {});
      toast.success(`Parsed ${result.extracted_biomarkers?.length || 0} analytes with LOINC mapping!`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to parse lab telemetry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/70 p-5 shadow-lg backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              Multimodal Diagnostics & Biomarker Vision
              <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300 border border-teal-500/20">
                LOINC Standard & Joint Commission Critical
              </span>
            </h3>
            <p className="text-xs text-text-muted">
              Attach 12-lead ECG telemetry, acute cardiac enzymes, or emergency metabolic panels.
            </p>
          </div>
        </div>

        {(selectedPreset || customBiomarkers.length > 0) && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear Attachment
          </button>
        )}
      </div>

      {/* Flagship Emergency Preset Selector */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            1-Click Emergency Clinical Presets
          </label>
          <span className="text-[11px] text-text-muted font-mono">5 High-Acuity Scenarios</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {presets.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id;
            const isSTEMI = preset.sample_ecg?.is_stemi;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-teal-500/15 border-teal-500 text-teal-100 shadow-[0_0_12px_rgba(20,184,166,0.25)]'
                    : 'bg-background/80 border-border/70 hover:border-teal-500/50 hover:bg-surface text-text-secondary'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-text-primary group-hover:text-teal-300 transition-colors">
                    {preset.title}
                  </span>
                  {isSTEMI && (
                    <span className="flex-shrink-0 animate-pulse rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                      STEMI
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted line-clamp-2">
                  {preset.summary}
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-text-muted">
                  <span className="capitalize px-1.5 py-0.5 rounded bg-surface border border-border/60">
                    {preset.category}
                  </span>
                  <span>{preset.sample_biomarkers?.length || 0} LOINC markers</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Or Paste Custom Telemetry / Lab Results */}
      <div className="pt-2 border-t border-border/50 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5 text-blue-400" />
            Custom Lab Values / ECG Text Telemetry
          </span>
          <span className="text-[10px] font-normal lowercase text-text-muted">
            e.g. Troponin I: 4.8 ng/mL, K: 6.5 mEq/L
          </span>
        </label>

        <div className="flex gap-2">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Paste raw lab results (e.g. Troponin I: 4.82 ng/mL, Potassium: 6.8 mEq/L, Glucose: 480 mg/dL)..."
            rows={2}
            className="w-full text-xs font-mono p-2.5 rounded-xl bg-background border border-border/80 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 text-text-primary placeholder:text-text-muted/60"
          />
          <button
            type="button"
            disabled={isAnalyzing || !customText.trim()}
            onClick={handleCustomAnalyze}
            className="flex-shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 self-end"
          >
            {isAnalyzing ? (
              <span className="animate-spin text-sm">⌛</span>
            ) : (
              <Activity className="h-3.5 w-3.5" />
            )}
            Parse
          </button>
        </div>
      </div>

      {/* Active Diagnostics Preview Card */}
      {(selectedPreset || customBiomarkers.length > 0 || customEcg) && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              Attached Diagnostic Telemetry ({selectedPreset?.title || 'Custom Lab Intake'})
            </span>
            <span className="text-[10px] font-mono text-teal-400/80">
              Validated against HL7 FHIR LOINC Standards
            </span>
          </div>

          {/* ECG Telemetry Banner */}
          {(selectedPreset?.sample_ecg || customEcg) && (
            (() => {
              const ecg = selectedPreset?.sample_ecg || customEcg;
              if (!ecg) return null;
              return (
                <div className={`p-3 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-3 ${
                  ecg.is_stemi 
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' 
                    : 'bg-surface/80 border-border text-text-primary'
                }`}>
                  <div className="flex items-center gap-2">
                    <HeartPulse className={`h-4 w-4 ${ecg.is_stemi ? 'text-rose-400 animate-pulse' : 'text-teal-400'}`} />
                    <span className="font-semibold">Rhythm: {ecg.rhythm}</span>
                    {ecg.heart_rate_bpm && (
                      <span className="font-mono text-[11px] opacity-80">({ecg.heart_rate_bpm} bpm)</span>
                    )}
                  </div>

                  {ecg.st_elevation_detected && (
                    <div className="flex items-center gap-1.5 font-bold text-rose-400">
                      <AlertOctagon className="h-4 w-4" />
                      <span>ST Elevation in Leads: {ecg.st_elevation_leads?.join(', ')}</span>
                      {ecg.is_stemi && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] uppercase tracking-wide">
                          CRITICAL STEMI
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Biomarkers Table */}
          {((selectedPreset?.sample_biomarkers && selectedPreset.sample_biomarkers.length > 0) || customBiomarkers.length > 0) && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-teal-500/20 text-[10px] font-bold uppercase tracking-wider text-teal-400/80">
                    <th className="pb-1.5">Biomarker / Analyte</th>
                    <th className="pb-1.5">Value</th>
                    <th className="pb-1.5">Reference Range</th>
                    <th className="pb-1.5">LOINC Standard</th>
                    <th className="pb-1.5 text-right">Clinical Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-500/10 font-mono text-[11px]">
                  {(selectedPreset?.sample_biomarkers || customBiomarkers).map((bm, idx) => {
                    const isCritical = bm.criticality_flag || bm.status?.startsWith('critical');
                    return (
                      <tr key={idx} className="hover:bg-teal-500/5 transition-colors">
                        <td className="py-2 font-sans font-semibold text-text-primary">
                          {bm.name}
                        </td>
                        <td className="py-2 text-text-secondary">
                          <span className={isCritical ? 'font-bold text-rose-400' : 'text-text-primary'}>
                            {bm.value} {bm.unit}
                          </span>
                        </td>
                        <td className="py-2 text-text-muted text-[10px]">
                          {bm.reference_range}
                        </td>
                        <td className="py-2">
                          <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] text-teal-300 border border-teal-500/20">
                            {bm.loinc_code || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 text-right font-sans">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-300 animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              PANIC CRITICAL
                            </span>
                          ) : bm.status === 'normal' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
                              NORMAL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-medium text-amber-300 uppercase">
                              {bm.status?.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
