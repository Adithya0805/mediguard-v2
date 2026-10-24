'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Flame, 
  AlertTriangle, 
  Pill, 
  Check, 
  ArrowRight, 
  HeartPulse, 
  Activity, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { PatientIntakeFormValues } from '@/lib/validations';

export interface ClinicalScenario {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MODERATE';
  theme: {
    border: string;
    bg: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
  };
  icon: React.ElementType;
  summary: string;
  data: PatientIntakeFormValues;
  highlights: {
    label: string;
    value: string;
  }[];
  expectedOutcome: string;
}

export const CLINICAL_SCENARIOS: ClinicalScenario[] = [
  {
    id: 'acute-coronary-syndrome',
    title: 'Acute Coronary Syndrome',
    subtitle: 'NSTEMI vs Unstable Angina with Diaphoresis',
    category: 'Emergency Cardiology',
    badge: 'CRITICAL · STAT 1',
    urgency: 'CRITICAL',
    theme: {
      border: 'border-rose-500/50 hover:border-rose-500',
      bg: 'bg-rose-950/20 hover:bg-rose-950/30',
      accent: 'text-rose-400',
      badgeBg: 'bg-rose-500/20 border-rose-500/40',
      badgeText: 'text-rose-300',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]'
    },
    icon: Flame,
    summary: '68yo female presenting with 90min retrosternal chest pressure radiating to left arm/jaw, acute diaphoresis, and shortness of breath.',
    highlights: [
      { label: 'Patient', value: 'Eleanor Vance, 68F' },
      { label: 'Vitals', value: 'BP 154/96 · HR 104 · SpO2 94%' },
      { label: 'Risk Factors', value: 'CAD, Type 2 DM, Hypertension' },
      { label: 'Key Meds', value: 'Atorvastatin 40mg, Aspirin 81mg' }
    ],
    expectedOutcome: 'STAT 12-lead ECG, troponin serial draw, cardiothoracic intervention protocol.',
    data: {
      patient_name: 'Eleanor Vance',
      age: 68,
      gender: 'female',
      chief_complaint: 'Crushing retrosternal chest pressure radiating to left arm and jaw for the past 90 minutes, accompanied by severe diaphoresis and acute shortness of breath.',
      symptoms: [
        'Chest pain (retrosternal pressure)',
        'Diaphoresis (cold sweats)',
        'Radiation to jaw and left arm',
        'Dyspnea on mild exertion',
        'Nausea without emesis'
      ],
      medical_history: [
        'Coronary Artery Disease (CAD)',
        'Type 2 Diabetes Mellitus',
        'Essential Hypertension',
        'Hyperlipidemia'
      ],
      allergies: [
        'Penicillin (Urticaria/Anaphylaxis)'
      ],
      current_medications: [
        'Atorvastatin 40mg daily',
        'Aspirin 81mg daily',
        'Metformin 1000mg twice daily',
        'Lisinopril 20mg daily'
      ],
      vitals: {
        bp: '154/96',
        heart_rate: 104,
        temperature: 98.4,
        spo2: 94,
        weight: 72,
        height: 165
      },
      attachments: []
    }
  },
  {
    id: 'severe-sepsis-alert',
    title: 'Severe Sepsis Alert',
    subtitle: 'qSOFA Criteria Met · Pulmonary Origin',
    category: 'Critical Care / ICU',
    badge: 'HIGH ACUITY · STAT 2',
    urgency: 'HIGH',
    theme: {
      border: 'border-amber-500/50 hover:border-amber-500',
      bg: 'bg-amber-950/20 hover:bg-amber-950/30',
      accent: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 border-amber-500/40',
      badgeText: 'text-amber-300',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]'
    },
    icon: AlertTriangle,
    summary: '54yo male with high fever 103.2°F, altered mentation, purulent sputum, hypotension (BP 88/54), and severe tachycardia (HR 122).',
    highlights: [
      { label: 'Patient', value: 'Marcus Sterling, 54M' },
      { label: 'Vitals', value: 'BP 88/54 (MAP 65) · HR 122 · SpO2 91%' },
      { label: 'Temp', value: '103.2°F (Severe Hyperpyrexia)' },
      { label: 'Allergies', value: 'Sulfa Drugs (Stevens-Johnson)' }
    ],
    expectedOutcome: 'qSOFA trigger, immediate blood cultures, IV fluid bolus 30mL/kg, broad-spectrum IV antibiotics.',
    data: {
      patient_name: 'Marcus Sterling',
      age: 54,
      gender: 'male',
      chief_complaint: 'High spiking fever, rigors, acute mental confusion, and productive cough with purulent rust-colored sputum deteriorating over 48 hours.',
      symptoms: [
        'High spiking fever (103.2°F)',
        'Acute confusion / altered mental status',
        'Productive cough (purulent rust sputum)',
        'Severe rigors and chills',
        'Tachypnea (rapid shallow breathing)',
        'Extreme generalized fatigue'
      ],
      medical_history: [
        'Chronic Obstructive Pulmonary Disease (COPD)',
        'Stage 2 Chronic Kidney Disease',
        'Tobacco use disorder (30 pack-years)'
      ],
      allergies: [
        'Sulfa Antibiotics (Severe rash / SJS)'
      ],
      current_medications: [
        'Tiotropium HandiHaler 18mcg once daily',
        'Albuterol HFA 90mcg PRN',
        'Amlodipine 5mg once daily'
      ],
      vitals: {
        bp: '88/54',
        heart_rate: 122,
        temperature: 103.2,
        spo2: 91,
        weight: 81,
        height: 178
      },
      attachments: []
    }
  },
  {
    id: 'polypharmacy-drug-toxicity',
    title: 'Polypharmacy Toxicity',
    subtitle: 'Quadruple Antiplatelet / NSAID Bleed Catastrophe',
    category: 'Pharmacovigilance',
    badge: 'DRUG INTERACTION ALERT',
    urgency: 'HIGH',
    theme: {
      border: 'border-purple-500/50 hover:border-purple-500',
      bg: 'bg-purple-950/20 hover:bg-purple-950/30',
      accent: 'text-purple-400',
      badgeBg: 'bg-purple-500/20 border-purple-500/40',
      badgeText: 'text-purple-300',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]'
    },
    icon: Pill,
    summary: '72yo male on Warfarin, Aspirin, and Clopidogrel with self-medicated Ibuprofen presenting with epistaxis, extensive bruising, and melena.',
    highlights: [
      { label: 'Patient', value: 'Devon Brooks, 72M' },
      { label: 'Vitals', value: 'BP 102/64 · HR 88 · SpO2 97%' },
      { label: 'Danger Rx', value: 'Warfarin + Aspirin + Plavix + Advil' },
      { label: 'Symptoms', value: 'Epistaxis, Melena, Orthostatic Dizziness' }
    ],
    expectedOutcome: 'OpenFDA high-risk contraindication alert, immediate anticoagulation reversal protocol, urgent INR test.',
    data: {
      patient_name: 'Devon Brooks',
      age: 72,
      gender: 'male',
      chief_complaint: 'Recurrent spontaneous epistaxis, multiple extensive ecchymoses on bilateral upper extremities, dark tarry stools, and orthostatic lightheadedness.',
      symptoms: [
        'Spontaneous recurrent epistaxis (nosebleeds)',
        'Extensive subcutaneous ecchymoses (bruising)',
        'Melena (dark tarry gastrointestinal stool)',
        'Orthostatic lightheadedness',
        'Generalized asthenia / pallor'
      ],
      medical_history: [
        'Non-valvular Atrial Fibrillation',
        'Previous Ischemic CVA (2021)',
        'Osteoarthritis of both knees',
        'Gastroesophageal Reflux Disease (GERD)'
      ],
      allergies: [
        'No Known Drug Allergies (NKDA)'
      ],
      current_medications: [
        'Warfarin 5mg daily (INR target 2.0-3.0)',
        'Aspirin 81mg daily',
        'Clopidogrel (Plavix) 75mg daily',
        'Omeprazole 40mg daily',
        'Ibuprofen 400mg TID (self-medicated for knee pain)'
      ],
      vitals: {
        bp: '102/64',
        heart_rate: 88,
        temperature: 98.1,
        spo2: 97,
        weight: 68,
        height: 172
      },
      attachments: []
    }
  }
];

interface ClinicalScenarioPresetsProps {
  selectedId: string | null;
  onSelectPreset: (scenario: ClinicalScenario, autoLaunch: boolean) => void;
  isSubmitting?: boolean;
}

export default function ClinicalScenarioPresets({
  selectedId,
  onSelectPreset,
  isSubmitting = false
}: ClinicalScenarioPresetsProps) {
  return (
    <div className="w-full space-y-3.5 mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-sans">
            1-Click Clinical Presets
          </h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
            Instant Demo
          </span>
        </div>
        <p className="text-xs text-text-muted">
          Select an evidence-based clinical case to test multi-agent reasoning instantly.
        </p>
      </div>

      {/* Grid of 3 Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CLINICAL_SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const isSelected = selectedId === scenario.id;

          return (
            <motion.div
              key={scenario.id}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                isSelected 
                  ? `${scenario.theme.border} ${scenario.theme.bg} ${scenario.theme.glow} ring-1 ring-inset ring-primary/40`
                  : `border-border/80 bg-surface/80 hover:bg-surface-raised hover:border-border`
              }`}
            >
              {/* Top Row: Category + Badge */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {scenario.category}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${scenario.theme.badgeBg} ${scenario.theme.badgeText}`}>
                    {scenario.badge}
                  </span>
                </div>

                {/* Scenario Title */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className={`p-2 rounded-lg border ${scenario.theme.badgeBg} ${scenario.theme.accent} shrink-0 mt-0.5`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary leading-tight font-sans">
                      {scenario.title}
                    </h4>
                    <p className="text-[11px] text-text-secondary leading-normal mt-0.5">
                      {scenario.subtitle}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-3">
                  {scenario.summary}
                </p>

                {/* Key Clinical Badges */}
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-background/60 border border-border/60 text-[11px] mb-4">
                  {scenario.highlights.map((h, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider">
                        {h.label}
                      </span>
                      <span className="text-text-primary font-semibold truncate text-[11px]">
                        {h.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onSelectPreset(scenario, false)}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    isSelected
                      ? 'bg-primary/20 border-primary/40 text-primary hover:bg-primary/30'
                      : 'bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                  }`}
                >
                  {isSelected ? '✓ Loaded' : 'Load Form'}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onSelectPreset(scenario, true)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-primary text-text-primary hover:bg-primary/90 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                  title="Load scenario and instantly run multi-agent analysis"
                >
                  <Zap className="h-3 w-3 fill-current" />
                  <span>1-Click Run</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
