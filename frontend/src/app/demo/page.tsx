'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Heart, 
  Brain, 
  Stethoscope, 
  Pill, 
  Activity as Lung, 
  Zap, 
  Play, 
  Check, 
  RotateCcw, 
  Github, 
  Mail, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  BookOpen,
  Database
} from 'lucide-react';
import api from '@/lib/api';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { toast } from 'sonner';

// Detailed data for fallback and patient preview
const DEMO_SCENARIO_METADATA: Record<string, {
  icon: any;
  label: string;
  focus: string;
  expected_urgency: 'low' | 'medium' | 'high' | 'critical';
  details: {
    symptoms: string[];
    medications: string[];
    vitals: Record<string, string | number>;
  };
}> = {
  "cardiac": {
    "icon": Heart,
    "label": "Cardiac Emergency",
    "focus": "ACS Detection",
    "expected_urgency": "high",
    "details": {
      "symptoms": ["chest pain", "radiation to left arm", "diaphoresis", "nausea", "shortness of breath"],
      "medications": ["metformin 500mg BD", "lisinopril 10mg OD", "aspirin 81mg OD", "atorvastatin 20mg OD"],
      "vitals": { "BP": "168/98 mmHg", "HR": "112 bpm", "Temp": "37.2 °C", "SpO2": "94%", "Weight": "82 kg", "Height": "170 cm" }
    }
  },
  "stroke": {
    "icon": Brain,
    "label": "Stroke Alert",
    "focus": "FAST Positive Triage",
    "expected_urgency": "critical",
    "details": {
      "symptoms": ["facial drooping", "slurred speech", "arm weakness", "sudden onset", "headache"],
      "medications": ["amlodipine 5mg OD", "warfarin 5mg OD"],
      "vitals": { "BP": "188/110 mmHg", "HR": "88 bpm", "Temp": "37.1 °C", "SpO2": "97%", "Weight": "68 kg", "Height": "162 cm" }
    }
  },
  "respiratory": {
    "icon": Stethoscope,
    "label": "Respiratory Distress",
    "focus": "Pulmonary Embolism",
    "expected_urgency": "high",
    "details": {
      "symptoms": ["dyspnea", "pleuritic chest pain", "right leg swelling", "tachycardia", "anxiety"],
      "medications": ["oral contraceptive pill"],
      "vitals": { "BP": "110/72 mmHg", "HR": "118 bpm", "Temp": "37.4 °C", "SpO2": "91%", "Weight": "62 kg", "Height": "165 cm" }
    }
  },
  "drug_interaction": {
    "icon": Pill,
    "label": "Drug Interaction Alert",
    "focus": "Drug Interaction Risk",
    "expected_urgency": "medium",
    "details": {
      "symptoms": ["knee pain", "joint stiffness"],
      "medications": ["warfarin 5mg OD", "aspirin 100mg OD", "bisoprolol 5mg OD"],
      "vitals": { "BP": "128/76 mmHg", "HR": "68 bpm", "Temp": "36.8 °C", "SpO2": "98%", "Weight": "78 kg", "Height": "168 cm" }
    }
  },
  "hypertensive_crisis": {
    "icon": Zap,
    "label": "Hypertensive Crisis",
    "focus": "Hypertensive Crisis",
    "expected_urgency": "critical",
    "details": {
      "symptoms": ["severe headache", "visual disturbances", "nausea", "dizziness", "blurred vision"],
      "medications": ["None (stopped medications)"],
      "vitals": { "BP": "210/128 mmHg", "HR": "92 bpm", "Temp": "37.0 °C", "SpO2": "98%", "Weight": "70 kg", "Height": "160 cm" }
    }
  }
};

export default function PublicDemoPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseKey, setSelectedCaseKey] = useState<string>("cardiac");
  const [isVitalsExpanded, setIsVitalsExpanded] = useState<boolean>(true);
  
  // Running state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("Intake Agent parsing...");
  
  // Results state
  const [results, setResults] = useState<any>(null);
  
  // System status state
  const [systemStatus, setSystemStatus] = useState<any>(null);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Fetch available cases and system status on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const casesRes = await api.get('/api/v1/demo/cases');
        setCases(casesRes.data);
      } catch (err) {
        console.warn("Failed to load demo cases from API, falling back to local list.", err);
        // Fallback mapping matching API output format
        setCases(Object.entries(DEMO_SCENARIO_METADATA).map(([key, val]) => ({
          case_key: key,
          label: val.label,
          description: `Fictional ${val.expected_urgency} urgency clinical scenario targeting ${val.focus}.`,
          expected_urgency: val.expected_urgency,
          symptom_count: val.details.symptoms.length
        })));
      }

      try {
        const statusRes = await api.get('/api/v1/demo/status');
        setSystemStatus(statusRes.data);
      } catch (err) {
        console.warn("Failed to load system status from API.", err);
        setSystemStatus({
          status: "operational",
          ai_model: "Claude 3 Sonnet",
          avg_demo_seconds: 45,
          knowledge_base_vectors: 74,
          demo_cases_available: 5,
          message: "MediGuard V2 is ready"
        });
      }
    }
    loadInitialData();
  }, []);

  // Timer simulation for progress bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) {
            return 98; // hold at 98% until API returns
          }
          const increment = 100 / 60; // 60 seconds estimate
          const next = prev + increment;
          
          // Cycling agent logs
          if (next < 20) {
            setLoadingMessage("Intake Agent parsing clinical note...");
          } else if (next < 40) {
            setLoadingMessage("Symptom Agent analyzing physical complaints...");
          } else if (next < 60) {
            setLoadingMessage("Diagnosis Agent referencing clinical RAG knowledge base...");
          } else if (next < 80) {
            setLoadingMessage("Drug Agent checking database for drug-drug interactions...");
          } else {
            setLoadingMessage("Report Agent compiling final clinical summary...");
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Run the clinical pipeline
  const handleRunDemo = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResults(null);
    setProgress(0);
    
    try {
      const response = await api.post(`/api/v1/demo/run/${selectedCaseKey}`);
      setResults(response.data);
      setProgress(100);
      toast.success("Clinical analysis completed successfully!");
      
      // Auto scroll to results after a short delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to execute clinical pipeline. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  const selectedMetadata = DEMO_SCENARIO_METADATA[selectedCaseKey];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#f1f5f9] flex flex-col font-sans" ref={topRef}>
      {/* Background visual grid and glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(13,148,136,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0d9488]/30 to-transparent" />

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 py-12 flex-1 flex flex-col gap-12 z-10">
        
        {/* SECTION 1 — HEADER */}
        <header className="flex flex-col items-center text-center gap-4">
          <div className="p-4 rounded-3xl bg-[#111827]/80 border border-[#0d9488]/30 shadow-[0_0_30px_rgba(13,148,136,0.15)] flex items-center justify-center animate-pulse">
            <ShieldAlert className="h-12 w-12 text-[#0d9488]" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-2">
            See <span className="bg-gradient-to-r from-[#0d9488] to-[#06b6d4] bg-clip-text text-transparent">MediGuard V2</span> in Action
          </h1>
          
          <p className="text-base sm:text-lg text-[#94a3b8] max-w-xl font-medium">
            5 specialist AI agents analyze a real clinical case in real time. No signup required.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full bg-[#1e293b]/80 border border-[#475569]/30 text-[#94a3b8] mt-1 shadow-md">
            <span>🔬 Fictional patient data — not for clinical use</span>
          </div>

          {systemStatus && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[#475569] mt-2">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#10b981] animate-ping" />
                Status: <span className="text-[#10b981] font-bold uppercase">{systemStatus.status}</span>
              </span>
              <span>•</span>
              <span>Model: <span className="text-[#94a3b8]">{systemStatus.ai_model}</span></span>
              <span>•</span>
              <span>Knowledge Base: <span className="text-[#94a3b8]">{systemStatus.knowledge_base_vectors} vectors</span></span>
            </div>
          )}
        </header>

        {/* SECTION 2 — CASE SELECTOR */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5 text-left">
            <h2 className="text-xl font-bold tracking-tight text-white">Select a Clinical Scenario</h2>
            <p className="text-sm text-[#94a3b8]">Choose one of the pre-built fictional cases to feed to our multi-agent orchestrator.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {cases.map((c) => {
              const key = c.case_key;
              const meta = DEMO_SCENARIO_METADATA[key];
              if (!meta) return null;
              
              const Icon = meta.icon;
              const isSelected = selectedCaseKey === key;
              
              // Triage color mappings
              const borderColors = {
                critical: 'border-t-[4px] border-t-[#dc2626]',
                high: 'border-t-[4px] border-t-[#d97706]',
                medium: 'border-t-[4px] border-t-[#ca8a04]',
                low: 'border-t-[4px] border-t-[#059669]'
              };

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isRunning) return;
                    setSelectedCaseKey(key);
                    setResults(null);
                  }}
                  disabled={isRunning}
                  className={`relative flex flex-col text-left p-5 rounded-2xl bg-[#111827] border ${borderColors[meta.expected_urgency]} ${
                    isSelected 
                      ? 'border-[#0d9488] shadow-[0_0_20px_rgba(13,148,136,0.15)] ring-1 ring-[#0d9488]' 
                      : 'border-[#1e293b] hover:border-[#1e293b]/80 hover:bg-[#111827]/90'
                  } transition-all duration-200 cursor-pointer disabled:opacity-50 h-full justify-between`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-[#0d9488]/15 text-[#0d9488]' : 'bg-[#1a2234] text-[#94a3b8]'} transition-colors`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        meta.expected_urgency === 'critical' ? 'bg-[#dc2626]/20 text-[#dc2626]' :
                        meta.expected_urgency === 'high' ? 'bg-[#d97706]/20 text-[#d97706]' :
                        meta.expected_urgency === 'medium' ? 'bg-[#ca8a04]/20 text-[#ca8a04]' : 'bg-[#059669]/20 text-[#059669]'
                      }`}>
                        {meta.expected_urgency}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white tracking-tight leading-tight">{c.label}</h3>
                      <p className="text-xs text-[#94a3b8] mt-1.5 line-clamp-3 leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#1e293b]/60 pt-3 flex flex-col gap-1 text-[11px] font-mono text-[#475569]">
                    <div className="flex justify-between">
                      <span>Expected:</span>
                      <span className="text-[#94a3b8] capitalize">{meta.expected_urgency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Focus:</span>
                      <span className="text-[#94a3b8] truncate max-w-[100px]">{meta.focus}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 3 — PATIENT PREVIEW */}
        {selectedMetadata && (
          <section className="rounded-2xl border border-[#1e293b] bg-[#111827]/60 backdrop-blur-md overflow-hidden text-left shadow-lg">
            <button
              onClick={() => setIsVitalsExpanded(!isVitalsExpanded)}
              className="w-full flex items-center justify-between p-5 bg-[#111827]/80 hover:bg-[#111827] border-b border-[#1e293b]/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[#0d9488]" />
                <span className="text-sm font-bold text-white tracking-tight">
                  Patient Intake Vector: <span className="text-[#0d9488]">Demo {selectedMetadata.label}</span>
                </span>
                <span className="text-xs text-[#94a3b8] font-mono">
                  ({selectedCaseKey === 'cardiac' || selectedCaseKey === 'drug_interaction' ? '65' : selectedCaseKey === 'stroke' ? '67' : selectedCaseKey === 'respiratory' ? '42' : '52'}
                  {selectedCaseKey === 'cardiac' || selectedCaseKey === 'drug_interaction' ? 'M' : 'F'})
                </span>
              </div>
              {isVitalsExpanded ? <ChevronUp className="h-4 w-4 text-[#94a3b8]" /> : <ChevronDown className="h-4 w-4 text-[#94a3b8]" />}
            </button>

            {isVitalsExpanded && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Symptoms Tags (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <h4 className="text-xs font-mono font-bold text-[#0d9488] uppercase tracking-wider">Symptoms Mapped</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMetadata.details.symptoms.map((symptom, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-[#1a2234] border border-[#1e293b] text-xs font-semibold text-[#94a3b8] capitalize">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Medications (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <h4 className="text-xs font-mono font-bold text-[#0d9488] uppercase tracking-wider">Current Regimen</h4>
                  {selectedMetadata.details.medications.length > 0 && selectedMetadata.details.medications[0] !== 'None (stopped medications)' ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMetadata.details.medications.map((med, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-[#0d9488]/10 border border-[#0d9488]/20 text-xs font-semibold text-[#0d9488]">
                          {med}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#475569] italic">No active medications registered.</span>
                  )}
                </div>

                {/* Vitals Table (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <h4 className="text-xs font-mono font-bold text-[#0d9488] uppercase tracking-wider">Baseline Vitals</h4>
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0a0f1e]/60 border border-[#1e293b]">
                    {Object.entries(selectedMetadata.details.vitals).map(([name, val]) => (
                      <div key={name} className="flex justify-between border-b border-[#1e293b]/40 pb-1.5 text-xs">
                        <span className="text-[#94a3b8] font-medium">{name}</span>
                        <span className="font-mono font-bold text-white">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECTION 4 — RUN BUTTON & PROGRESS */}
        <section className="flex flex-col gap-4 items-center">
          {!isRunning ? (
            <button
              onClick={handleRunDemo}
              disabled={isRunning || !selectedCaseKey}
              className="w-full sm:w-auto px-10 py-4.5 rounded-2xl bg-gradient-to-r from-[#0d9488] to-[#06b6d4] hover:from-[#0f766e] hover:to-[#0891b2] text-white font-bold text-md shadow-[0_0_30px_rgba(13,148,136,0.25)] hover:shadow-[0_0_40px_rgba(13,148,136,0.35)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              <Play className="h-5 w-5 fill-white" />
              <span>Analyze with MediGuard AI</span>
            </button>
          ) : (
            <div className="w-full p-6 rounded-2xl border border-[#1e293b] bg-[#111827] flex flex-col gap-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#0d9488] font-bold text-sm">
                  <span className="h-2 w-2 rounded-full bg-[#0d9488] animate-ping" />
                  <span>⚙️ AI Agents Running...</span>
                </div>
                <span className="text-xs text-[#94a3b8] font-mono">{loadingMessage}</span>
              </div>
              
              {/* Progress bar container */}
              <div className="w-full bg-[#0a0f1e] rounded-full h-2.5 overflow-hidden border border-[#1e293b]">
                <div 
                  className="bg-gradient-to-r from-[#0d9488] to-[#06b6d4] h-2.5 transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#475569] font-mono">
                <span>Intake → Symptom → Diagnosis → Drug Check → Report</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
            </div>
          )}
          <p className="text-xs text-[#475569] max-w-md text-center">
            Powered by Claude 3 Sonnet + PubMed Medical Knowledge Base + OpenFDA drug databases.
          </p>
        </section>

        {/* SECTION 5 — RESULTS PANEL */}
        {results && (
          <div 
            ref={resultsRef} 
            className="relative rounded-3xl border border-[#1e293b] bg-[#111827]/70 backdrop-blur-lg overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col gap-8 text-left"
          >
            {/* MANDATORY DEMO WATERMARK */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-20">
              <div className="text-white opacity-[0.06] font-black text-6xl md:text-8xl tracking-widest uppercase rotate-[-30deg] whitespace-nowrap pointer-events-none select-none">
                {results.watermark}
              </div>
            </div>
            
            <div className="absolute inset-0 flex items-start justify-center pointer-events-none select-none overflow-hidden z-20 pt-36">
              <div className="text-white opacity-[0.03] font-black text-6xl md:text-8xl tracking-widest uppercase rotate-[-30deg] whitespace-nowrap pointer-events-none select-none">
                {results.watermark}
              </div>
            </div>

            {/* CARD A — Urgency Banner */}
            <div className={`w-full p-6 rounded-2xl border text-center shadow-lg ${
              results.results.urgency_level === 'critical' 
                ? 'bg-[#dc2626]/20 border-[#dc2626] text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] critical-pulse-badge' 
                : 'bg-[#d97706]/20 border-[#d97706] text-white'
            }`}>
              <h3 className="text-lg font-mono font-black uppercase tracking-widest leading-none">
                URGENCY STATUS: {results.results.urgency_level}
              </h3>
            </div>

            {/* Grid of Results Info */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column (8 cols): Primary Diagnosis + Differential Table + Executive Summary */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                
                {/* CARD B — Primary Diagnosis */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#0d9488]/30 shadow-md flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-28 w-28 bg-[#0d9488]/5 rounded-full blur-xl scale-125 pointer-events-none" />
                  
                  <div className="border-b border-[#1e293b]/60 pb-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4.5 w-4.5 text-[#0d9488] fill-[#0d9488]" />
                      <span className="text-xs font-mono font-bold text-[#0d9488] uppercase tracking-wider">Primary Diagnosis Candidate</span>
                    </div>
                    {results.results.primary_diagnosis ? (
                      <span className="text-xs font-mono font-bold text-[#94a3b8] uppercase">
                        ICD-10: {results.results.ddx_list?.[0]?.icd10_code || 'I24.9'}
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-[#dc2626] uppercase">Bypassed</span>
                    )}
                  </div>

                  {results.results.primary_diagnosis ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">{results.results.primary_diagnosis}</h3>
                        <span className="text-xs font-mono text-[#94a3b8] mt-1 block">Decision Confidence: {Math.round(results.results.primary_confidence * 100)}%</span>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="w-full bg-[#0a0f1e] rounded-full h-2 overflow-hidden border border-[#1e293b]">
                          <div 
                            className="bg-[#0d9488] h-2 transition-all duration-500" 
                            style={{ width: `${results.results.primary_confidence * 100}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#dc2626]/5 border border-[#dc2626]/20 text-xs text-[#94a3b8] leading-relaxed">
                      💡 <b>Emergency Triage Bypassed Full Diagnosis:</b> The Symptom Agent detected emergency physiological signs (Urgency: Critical) and fast-tracked report compilation, routing directly to clinical alert generation to avoid pipeline lag.
                    </div>
                  )}
                </div>

                {/* CARD C — Differential Diagnoses */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] shadow-md flex flex-col gap-4">
                  <h3 className="font-bold text-base text-white tracking-wide">Differential Diagnosis Mapping</h3>
                  
                  {results.results.ddx_count > 0 ? (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-[#1e293b] text-[#94a3b8] font-bold uppercase tracking-wider bg-[#0a0f1e]/40">
                            <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                            <th className="py-2.5 px-4">Diagnosis</th>
                            <th className="py-2.5 px-4 w-24">ICD-10</th>
                            <th className="py-2.5 px-4 w-36">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.results.ddx_list.map((ddx: any) => (
                            <tr key={ddx.rank} className="border-b border-[#1e293b]/40 hover:bg-[#1a2234]/40">
                              <td className="py-3 px-4 font-mono font-bold text-center">{ddx.rank}</td>
                              <td className="py-3 px-4 font-bold text-white">{ddx.diagnosis}</td>
                              <td className="py-3 px-4 font-mono text-[#94a3b8]">{ddx.icd10_code}</td>
                              <td className="py-3 px-4 flex flex-col gap-1.5 justify-center">
                                <span className="font-mono text-[10px] text-[#94a3b8]">{Math.round(ddx.confidence * 100)}%</span>
                                <div className="w-full bg-[#0a0f1e] rounded-full h-1.5 overflow-hidden border border-[#1e293b]">
                                  <div 
                                    className="bg-[#06b6d4] h-1.5" 
                                    style={{ width: `${ddx.confidence * 100}%` }} 
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#1a2234] border border-[#1e293b] text-xs text-[#94a3b8] text-center leading-relaxed">
                      ⚠️ No secondary differentials calculated. Emergency fast-track bypassing full DDx calculations was triggered.
                    </div>
                  )}
                </div>

                {/* CARD F — Executive Summary */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] shadow-md flex flex-col gap-3">
                  <h3 className="font-bold text-base text-white tracking-wide">Executive Clinical Summary</h3>
                  <p className="text-xs text-[#f1f5f9] leading-relaxed bg-[#0a0f1e]/40 p-4.5 rounded-xl border border-[#1e293b]/80 italic font-medium leading-6">
                    {results.results.executive_summary}
                  </p>
                </div>

              </div>

              {/* Right Column (4 cols): Recommended Tests + Drug Safety + Stats */}
              <div className="lg:col-span-4 flex flex-col gap-8">
                
                {/* CARD D — Recommended Tests */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] shadow-md flex flex-col gap-4">
                  <h3 className="font-bold text-base text-white tracking-wide">Recommended Workup</h3>
                  
                  <div className="flex flex-col gap-3">
                    {results.results.recommended_tests.length > 0 ? (
                      results.results.recommended_tests.map((test: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 text-xs border-b border-[#1e293b]/40 pb-3 last:border-0 last:pb-0">
                          <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-[#0d9488]/15 border border-[#0d9488]/30 font-bold text-[#0d9488] text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-[#94a3b8] leading-relaxed">{test}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[#475569] italic">No specific tests generated. Check summary recommendation.</span>
                    )}
                  </div>
                </div>

                {/* CARD E — Drug Safety */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] shadow-md flex flex-col gap-3">
                  <h3 className="font-bold text-base text-white tracking-wide">Pharmaceutical Screening</h3>
                  {results.results.drug_interactions_found > 0 ? (
                    <div className="p-4.5 rounded-xl bg-[#dc2626]/10 border border-[#dc2626]/20 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[#dc2626] font-bold text-xs">
                        <AlertTriangle className="h-4.5 w-4.5" />
                        <span>⚠️ {results.results.drug_interactions_found} Interactions Detected</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                        Dangerous drug combo identified. Evaluated risks and contraindications indicate review required.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[#10b981] font-bold text-xs">
                        <Check className="h-4.5 w-4.5" />
                        <span>✅ No dangerous interactions</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                        Medications checked successfully against FDA databases. No contraindications or severe adverse events flagged.
                      </p>
                    </div>
                  )}
                </div>

                {/* CARD G — Pipeline Stats */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] shadow-md flex flex-col gap-4 font-mono text-xs">
                  <h3 className="font-bold font-sans text-base text-white tracking-wide">Pipeline Telemetry</h3>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between border-b border-[#1e293b]/40 pb-2">
                      <span className="text-[#475569]">AI Agents Run:</span>
                      <span className="text-[#94a3b8] font-bold">{results.results.agents_completed}/5 Completed</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1e293b]/40 pb-2">
                      <span className="text-[#475569]">Analysis Time:</span>
                      <span className="text-[#0d9488] font-bold">{results.processing_time_seconds} seconds</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1e293b]/40 pb-2">
                      <span className="text-[#475569]">Evidence Sources:</span>
                      <span className="text-[#06b6d4] font-bold">{results.results.evidence_sources} PubMed articles</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#475569]">Primary AI Model:</span>
                      <span className="text-[#94a3b8] font-bold">Claude 3 Sonnet</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* SECTION 6 — CTA AFTER RESULTS */}
        {results && (
          <section className="flex flex-col items-center text-center gap-6 border-t border-[#1e293b]/60 pt-12">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">This is what MediGuard V2 does for every patient — in seconds.</h3>
              <p className="text-sm text-[#94a3b8] max-w-lg mx-auto">
                Securely syndicate medical logs directly to hospital EHR systems, download clinical printouts, and review detailed diagnostic justifications.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => {
                  setResults(null);
                  topRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 rounded-xl border border-[#1e293b] bg-[#111827] hover:bg-[#111827]/80 text-[#f1f5f9] text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Try Another Case</span>
              </button>

              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-xl border border-[#1e293b] bg-[#111827] hover:bg-[#111827]/80 text-[#f1f5f9] text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Github className="h-4 w-4" />
                <span>View on GitHub</span>
              </a>

              <a
                href="mailto:access@mediguard.ai?subject=MediGuard V2 Access Request"
                className="px-6 py-3.5 rounded-xl bg-[#0d9488] hover:bg-[#0d9488]/90 text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                <span>Request Access</span>
              </a>
            </div>

            {/* DISCLAIMER BOX */}
            <div className="w-full p-4.5 rounded-2xl bg-[#111827]/40 border border-[#1e293b] max-w-2xl text-left">
              <p className="text-[10px] sm:text-xs text-[#94a3b8] leading-relaxed">
                🚨 <b>MediGuard V2 Demo Disclaimer:</b> This demonstration utilizes fictional, synthesized patient data for illustration purposes only. This output is AI-generated and must never be used for any real clinical decision or triage. Always consult a licensed, qualified physician for any actual medical care or advice.
              </p>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
