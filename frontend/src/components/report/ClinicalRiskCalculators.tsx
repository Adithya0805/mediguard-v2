'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Heart, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react';
import { PatientSession } from '@/types';

interface ClinicalRiskCalculatorsProps {
  session: PatientSession;
}

export default function ClinicalRiskCalculators({ session }: ClinicalRiskCalculatorsProps) {
  const [activeCalculator, setActiveCalculator] = useState<'heart' | 'qsofa' | 'hasbled'>('heart');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. HEART SCORE STATE & AUTO-DETECTION
  // ─────────────────────────────────────────────────────────────────────────────
  const initialAgeHeart = () => {
    const age = session.patient_age || 0;
    if (age >= 65) return 2;
    if (age >= 45) return 1;
    return 0;
  };

  const initialRiskFactorsHeart = () => {
    const history = (session.medical_history || []).map((h) => h.toLowerCase()).join(' ');
    let count = 0;
    if (history.includes('cad') || history.includes('coronary') || history.includes('infarction') || history.includes('stent')) return 2;
    if (history.includes('hypertension') || history.includes('htn')) count++;
    if (history.includes('diabetes') || history.includes('dm')) count++;
    if (history.includes('hyperlipidemia') || history.includes('cholesterol')) count++;
    if (history.includes('smok') || history.includes('tobacco')) count++;
    return count >= 3 ? 2 : count >= 1 ? 1 : 0;
  };

  const initialHistoryHeart = () => {
    const complaint = (session.chief_complaint || '').toLowerCase();
    const symptoms = (session.symptoms || []).join(' ').toLowerCase();
    if (
      (complaint.includes('crush') || complaint.includes('radiat') || complaint.includes('pressure')) &&
      (symptoms.includes('diaphor') || symptoms.includes('sweat'))
    ) {
      return 2; // Highly suspicious
    }
    if (complaint.includes('chest') || symptoms.includes('chest')) return 1;
    return 0;
  };

  const [heartHistory, setHeartHistory] = useState<number>(initialHistoryHeart);
  const [heartECG, setHeartECG] = useState<number>(1); // Non-specific repolarization default
  const [heartAge, setHeartAge] = useState<number>(initialAgeHeart);
  const [heartRisk, setHeartRisk] = useState<number>(initialRiskFactorsHeart);
  const [heartTroponin, setHeartTroponin] = useState<number>(1); // 1-3x normal limit / borderline

  const heartScore = heartHistory + heartECG + heartAge + heartRisk + heartTroponin;

  const getHeartInterpretation = () => {
    if (heartScore >= 7) {
      return {
        level: 'HIGH RISK',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        badge: 'bg-rose-500 text-white',
        maceRisk: '50% - 65% Risk of 6-Week MACE',
        recommendation: 'Immediate early invasive strategy indicated. Urgent cardiology consultation, coronary angiography planning, and admission to CCU/telemetry floor.'
      };
    }
    if (heartScore >= 4) {
      return {
        level: 'MODERATE RISK',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        badge: 'bg-amber-500 text-slate-950',
        maceRisk: '12% - 16.6% Risk of 6-Week MACE',
        recommendation: 'Clinical observation admission. Serial troponin testing at 0, 3, and 6 hours plus continuous cardiac monitoring before considering provocative non-invasive ischemia testing.'
      };
    }
    return {
      level: 'LOW RISK',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badge: 'bg-emerald-500 text-slate-950',
      maceRisk: '0.9% - 1.7% Risk of 6-Week MACE',
      recommendation: 'Early discharge candidate. Outpatient provocative testing or coronary CT angiography can be arranged within 72 hours if serial high-sensitivity troponins remain negative.'
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. qSOFA SCORE (SEPSIS-3) STATE & AUTO-DETECTION
  // ─────────────────────────────────────────────────────────────────────────────
  const initialSbpQsofa = () => {
    const bpStr = session.vitals?.bp || '';
    const match = bpStr.match(/(\d+)\//);
    if (match) {
      const sbp = parseInt(match[1], 10);
      return sbp <= 100;
    }
    return false;
  };

  const initialMentationQsofa = () => {
    const text = `${session.chief_complaint} ${(session.symptoms || []).join(' ')}`.toLowerCase();
    return text.includes('confus') || text.includes('altered') || text.includes('letharg') || text.includes('mentation');
  };

  const initialRrQsofa = () => {
    const text = `${session.chief_complaint} ${(session.symptoms || []).join(' ')}`.toLowerCase();
    return text.includes('tachypnea') || text.includes('shortness of breath') || text.includes('dyspnea');
  };

  const [qsofaRr, setQsofaRr] = useState<boolean>(initialRrQsofa);
  const [qsofaMentation, setQsofaMentation] = useState<boolean>(initialMentationQsofa);
  const [qsofaSbp, setQsofaSbp] = useState<boolean>(initialSbpQsofa);

  const qsofaScore = (qsofaRr ? 1 : 0) + (qsofaMentation ? 1 : 0) + (qsofaSbp ? 1 : 0);

  const getQsofaInterpretation = () => {
    if (qsofaScore >= 2) {
      return {
        level: 'HIGH RISK SEPSIS (qSOFA >= 2)',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        badge: 'bg-rose-500 text-white',
        mortality: '> 10% In-Hospital Mortality Risk',
        recommendation: 'Immediate Surviving Sepsis 1-Hour Bundle: Draw blood cultures, initiate broad-spectrum IV antimicrobials within 60 minutes, administer 30 mL/kg IV crystalloid fluid bolus, and check serum lactate STAT.'
      };
    }
    return {
      level: 'LOW RISK SEPSIS (qSOFA < 2)',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badge: 'bg-emerald-500 text-slate-950',
      mortality: '< 1% In-Hospital Mortality Risk',
      recommendation: 'Low risk of acute deterioration based on bedside criteria. Continue focused clinical evaluation for source of infection and monitor vitals closely.'
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. HAS-BLED SCORE (ANTICOAGULATION BLEEDING RISK)
  // ─────────────────────────────────────────────────────────────────────────────
  const initialHasbledDrugs = () => {
    const meds = (session.current_medications || []).map((m) => m.toLowerCase()).join(' ');
    return (
      meds.includes('aspirin') ||
      meds.includes('clopidogrel') ||
      meds.includes('plavix') ||
      meds.includes('ibuprofen') ||
      meds.includes('nsaid')
    );
  };

  const initialHasbledBleeding = () => {
    const text = `${session.chief_complaint} ${(session.symptoms || []).join(' ')}`.toLowerCase();
    return text.includes('epistaxis') || text.includes('bruis') || text.includes('melena') || text.includes('bleed');
  };

  const initialHasbledStroke = () => {
    const text = (session.medical_history || []).join(' ').toLowerCase();
    return text.includes('stroke') || text.includes('cva') || text.includes('tia');
  };

  const [hasbledHypertension, setHasbledHypertension] = useState<boolean>(false);
  const [hasbledRenalLiver, setHasbledRenalLiver] = useState<boolean>(false);
  const [hasbledStroke, setHasbledStroke] = useState<boolean>(initialHasbledStroke);
  const [hasbledBleeding, setHasbledBleeding] = useState<boolean>(initialHasbledBleeding);
  const [hasbledLabileInr, setHasbledLabileInr] = useState<boolean>(false);
  const [hasbledElderly, setHasbledElderly] = useState<boolean>((session.patient_age || 0) > 65);
  const [hasbledDrugs, setHasbledDrugs] = useState<boolean>(initialHasbledDrugs);

  const hasbledScore = 
    (hasbledHypertension ? 1 : 0) +
    (hasbledRenalLiver ? 1 : 0) +
    (hasbledStroke ? 1 : 0) +
    (hasbledBleeding ? 1 : 0) +
    (hasbledLabileInr ? 1 : 0) +
    (hasbledElderly ? 1 : 0) +
    (hasbledDrugs ? 1 : 0);

  const getHasbledInterpretation = () => {
    if (hasbledScore >= 3) {
      return {
        level: 'HIGH BLEEDING RISK (Score >= 3)',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        badge: 'bg-rose-500 text-white',
        bleedRisk: '3.7 - 12.5 Bleeds per 100 Patient-Years',
        recommendation: 'High risk of major bleeding on antithrombotics. Caution warranted. Address all modifiable risk factors (discontinue concurrent NSAIDs/antiplatelets), monitor INR closely, and have reversal agents on standby.'
      };
    }
    return {
      level: 'LOW / MODERATE BLEEDING RISK (Score < 3)',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badge: 'bg-emerald-500 text-slate-950',
      bleedRisk: '1.0 - 1.9 Bleeds per 100 Patient-Years',
      recommendation: 'Low-to-moderate bleeding risk. Anticoagulation therapy can generally be safely continued with standard routine monitoring.'
    };
  };

  const heartInterp = getHeartInterpretation();
  const qsofaInterp = getQsofaInterpretation();
  const hasbledInterp = getHasbledInterpretation();

  return (
    <div className="w-full space-y-6 text-left">
      {/* Module Title Card */}
      <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary tracking-wide font-sans">
                Evidence-Based Clinical Risk Calculators
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">
                Auto-Calibrated
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Stratifies ischemic, septic, and bleeding probabilities using gold-standard clinical prediction rules.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background border border-border/80">
          {[
            { id: 'heart', label: 'HEART Score', icon: Heart, score: heartScore },
            { id: 'qsofa', label: 'qSOFA (Sepsis)', icon: Flame, score: qsofaScore },
            { id: 'hasbled', label: 'HAS-BLED (Bleed)', icon: ShieldAlert, score: hasbledScore }
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeCalculator === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCalculator(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-black/20 text-white' : 'bg-surface-raised text-primary'
                }`}>
                  {tab.score}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          1. HEART SCORE CALCULATOR
          ───────────────────────────────────────────────────────────────────────── */}
      {activeCalculator === 'heart' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (70%) */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-surface border border-border space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="font-sans font-bold text-sm text-text-primary">
                  HEART Pathway for Emergency Chest Pain
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Validates 6-week risk of Major Adverse Cardiac Events (MACE: MI, PCI, CABG, death).
                </p>
              </div>
              <button
                onClick={() => {
                  setHeartHistory(initialHistoryHeart());
                  setHeartECG(1);
                  setHeartAge(initialAgeHeart());
                  setHeartRisk(initialRiskFactorsHeart());
                  setHeartTroponin(1);
                }}
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors font-mono"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset to Patient Defaults</span>
              </button>
            </div>

            {/* Parameter Rows */}
            <div className="space-y-4 text-xs">
              {/* History */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-text-primary">H — History</span>
                  <span className="font-mono text-primary font-bold">+{heartHistory} pts</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { pts: 2, label: 'Highly suspicious (+2)', desc: 'Retrosternal pressure, diaphoresis, radiation' },
                    { pts: 1, label: 'Moderately suspicious (+1)', desc: 'Atypical presentation or equivocal features' },
                    { pts: 0, label: 'Slightly suspicious (+0)', desc: 'Pleuritic, reproducible chest wall pain' }
                  ].map((opt) => (
                    <button
                      key={opt.pts}
                      onClick={() => setHeartHistory(opt.pts)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        heartHistory === opt.pts
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : 'bg-background/60 border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ECG */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-text-primary">E — ECG</span>
                  <span className="font-mono text-primary font-bold">+{heartECG} pts</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { pts: 2, label: 'Significant ST deviation (+2)', desc: 'ST depression >= 1mm, LBBB, repol strain' },
                    { pts: 1, label: 'Non-specific changes (+1)', desc: 'T-wave inversions, non-specific ST changes' },
                    { pts: 0, label: 'Normal (+0)', desc: 'Normal 12-lead sinus rhythm tracing' }
                  ].map((opt) => (
                    <button
                      key={opt.pts}
                      onClick={() => setHeartECG(opt.pts)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        heartECG === opt.pts
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : 'bg-background/60 border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-text-primary">A — Age</span>
                  <span className="font-mono text-primary font-bold">+{heartAge} pts</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { pts: 2, label: '>= 65 years (+2)', desc: 'Geriatric coronary risk threshold' },
                    { pts: 1, label: '45 - 64 years (+1)', desc: 'Intermediate age cohort' },
                    { pts: 0, label: '< 45 years (+0)', desc: 'Low statistical age risk' }
                  ].map((opt) => (
                    <button
                      key={opt.pts}
                      onClick={() => setHeartAge(opt.pts)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        heartAge === opt.pts
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : 'bg-background/60 border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-text-primary">R — Risk Factors (HTN, DM, CAD, Lipids, Smoking)</span>
                  <span className="font-mono text-primary font-bold">+{heartRisk} pts</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { pts: 2, label: '>= 3 risk factors or CAD (+2)', desc: 'Known vascular disease or multiple comorbidities' },
                    { pts: 1, label: '1 - 2 risk factors (+1)', desc: 'Mild-moderate cardiovascular profile' },
                    { pts: 0, label: 'No risk factors (+0)', desc: 'Absence of known atherosclerotic drivers' }
                  ].map((opt) => (
                    <button
                      key={opt.pts}
                      onClick={() => setHeartRisk(opt.pts)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        heartRisk === opt.pts
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : 'bg-background/60 border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Troponin */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-text-primary">T — Initial Cardiac Troponin</span>
                  <span className="font-mono text-primary font-bold">+{heartTroponin} pts</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { pts: 2, label: '> 3x normal limit (+2)', desc: 'Overt myocardial injury necrosis' },
                    { pts: 1, label: '1 - 3x normal limit (+1)', desc: 'Borderline or equivocal biomarker delta' },
                    { pts: 0, label: '<= normal limit (+0)', desc: 'Baseline troponin below cutoff threshold' }
                  ].map((opt) => (
                    <button
                      key={opt.pts}
                      onClick={() => setHeartTroponin(opt.pts)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        heartTroponin === opt.pts
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : 'bg-background/60 border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Result Card (30%) */}
          <div className="lg:col-span-4 p-6 rounded-2xl bg-surface border border-border flex flex-col gap-5 text-left shadow-lg">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Calculated Total</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold font-mono text-text-primary">{heartScore}</span>
                <span className="text-sm font-mono text-text-muted">/ 10 Points</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${heartInterp.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">{heartInterp.level}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${heartInterp.badge}`}>
                  MACE Indicator
                </span>
              </div>
              <p className="text-sm font-bold">{heartInterp.maceRisk}</p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Recommended Clinical Pathway
              </span>
              <p className="text-xs text-text-secondary leading-relaxed bg-background/50 p-3.5 rounded-xl border border-border/60">
                {heartInterp.recommendation}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 text-[10px] text-text-muted font-mono">
              Reference: Six AJ, et al. Chest pain in the emergency room: value of the HEART score. Neth Heart J. (PMID: 18841243)
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          2. qSOFA SCORE CALCULATOR
          ───────────────────────────────────────────────────────────────────────── */}
      {activeCalculator === 'qsofa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 p-6 rounded-2xl bg-surface border border-border space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="font-sans font-bold text-sm text-text-primary">
                  quick Sequential Organ Failure Assessment (qSOFA)
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Sepsis-3 bedside screening tool to identify infected patients at risk of in-hospital death.
                </p>
              </div>
              <button
                onClick={() => {
                  setQsofaRr(initialRrQsofa());
                  setQsofaMentation(initialMentationQsofa());
                  setQsofaSbp(initialSbpQsofa());
                }}
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors font-mono"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset to Patient Defaults</span>
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'rr',
                  label: 'Respiratory Rate >= 22 breaths/min',
                  desc: 'Tachypnea indicative of respiratory compromise or metabolic acidosis compensation',
                  checked: qsofaRr,
                  onChange: () => setQsofaRr(!qsofaRr)
                },
                {
                  id: 'mentation',
                  label: 'Altered Mental Status (GCS < 15)',
                  desc: 'Acute confusion, disorientation, lethargy, or reduced Glasgow Coma Scale',
                  checked: qsofaMentation,
                  onChange: () => setQsofaMentation(!qsofaMentation)
                },
                {
                  id: 'sbp',
                  label: 'Systolic Blood Pressure <= 100 mmHg',
                  desc: 'Hypotension indicating possible sepsis-induced systemic vascular vasodilation',
                  checked: qsofaSbp,
                  onChange: () => setQsofaSbp(!qsofaSbp)
                }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={item.onChange}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    item.checked
                      ? 'bg-primary/15 border-primary/40 text-text-primary shadow-sm'
                      : 'bg-background/50 border-border text-text-secondary hover:bg-background'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.onChange}
                    className="mt-1 rounded border-slate-700 bg-background text-primary focus:ring-0 h-4 w-4"
                  />
                  <div>
                    <span className="text-sm font-bold block">{item.label}</span>
                    <span className="text-xs text-text-muted mt-0.5 block">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl bg-surface border border-border flex flex-col gap-5 text-left shadow-lg">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Calculated Total</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold font-mono text-text-primary">{qsofaScore}</span>
                <span className="text-sm font-mono text-text-muted">/ 3 Criteria Met</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${qsofaInterp.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">{qsofaInterp.level}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${qsofaInterp.badge}`}>
                  Sepsis-3
                </span>
              </div>
              <p className="text-sm font-bold">{qsofaInterp.mortality}</p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Sepsis Bundle Directive
              </span>
              <p className="text-xs text-text-secondary leading-relaxed bg-background/50 p-3.5 rounded-xl border border-border/60">
                {qsofaInterp.recommendation}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 text-[10px] text-text-muted font-mono">
              Reference: Singer M, et al. Third International Consensus Definitions for Sepsis and Septic Shock (JAMA 2016, PMID: 26903338)
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          3. HAS-BLED SCORE CALCULATOR
          ───────────────────────────────────────────────────────────────────────── */}
      {activeCalculator === 'hasbled' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 p-6 rounded-2xl bg-surface border border-border space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="font-sans font-bold text-sm text-text-primary">
                  HAS-BLED Major Bleeding Risk Score
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Estimates 1-year major bleeding probability in patients on anticoagulants / antiplatelet therapy.
                </p>
              </div>
              <button
                onClick={() => {
                  setHasbledHypertension(false);
                  setHasbledRenalLiver(false);
                  setHasbledStroke(initialHasbledStroke());
                  setHasbledBleeding(initialHasbledBleeding());
                  setHasbledLabileInr(false);
                  setHasbledElderly((session.patient_age || 0) > 65);
                  setHasbledDrugs(initialHasbledDrugs());
                }}
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors font-mono"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset to Patient Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'h', letter: 'H', label: 'Hypertension (SBP > 160)', checked: hasbledHypertension, onChange: () => setHasbledHypertension(!hasbledHypertension) },
                { id: 'a', letter: 'A', label: 'Abnormal Renal / Liver Function', checked: hasbledRenalLiver, onChange: () => setHasbledRenalLiver(!hasbledRenalLiver) },
                { id: 's', letter: 'S', label: 'Stroke History (CVA / TIA)', checked: hasbledStroke, onChange: () => setHasbledStroke(!hasbledStroke) },
                { id: 'b', letter: 'B', label: 'Bleeding Predisposition / Prior Bleed', checked: hasbledBleeding, onChange: () => setHasbledBleeding(!hasbledBleeding) },
                { id: 'l', letter: 'L', label: 'Labile INRs (TTR < 60%)', checked: hasbledLabileInr, onChange: () => setHasbledLabileInr(!hasbledLabileInr) },
                { id: 'e', letter: 'E', label: 'Elderly (> 65 Years)', checked: hasbledElderly, onChange: () => setHasbledElderly(!hasbledElderly) },
                { id: 'd', letter: 'D', label: 'Drugs (Antiplatelet / NSAID) or Alcohol', checked: hasbledDrugs, onChange: () => setHasbledDrugs(!hasbledDrugs) }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={item.onChange}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    item.checked
                      ? 'bg-primary/15 border-primary/40 text-text-primary shadow-sm'
                      : 'bg-background/50 border-border text-text-secondary hover:bg-background'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-lg bg-surface-raised border border-border font-mono font-bold text-xs flex items-center justify-center text-primary">
                      {item.letter}
                    </span>
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.onChange}
                    className="rounded border-slate-700 bg-background text-primary focus:ring-0 h-4 w-4"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl bg-surface border border-border flex flex-col gap-5 text-left shadow-lg">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Calculated Total</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold font-mono text-text-primary">{hasbledScore}</span>
                <span className="text-sm font-mono text-text-muted">/ 7 Points</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${hasbledInterp.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">{hasbledInterp.level}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${hasbledInterp.badge}`}>
                  HAS-BLED
                </span>
              </div>
              <p className="text-sm font-bold">{hasbledInterp.bleedRisk}</p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Anticoagulation Safety Directive
              </span>
              <p className="text-xs text-text-secondary leading-relaxed bg-background/50 p-3.5 rounded-xl border border-border/60">
                {hasbledInterp.recommendation}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 text-[10px] text-text-muted font-mono">
              Reference: Pisters R, et al. A novel user-friendly score (HAS-BLED) to assess 1-year risk of major bleeding. Chest (PMID: 20299623)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
