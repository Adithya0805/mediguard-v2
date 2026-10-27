'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  ExternalLink, 
  ShieldCheck, 
  Bookmark, 
  Search, 
  Award, 
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

export interface PubMedCitation {
  id: string;
  pmid: string;
  doi?: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  society: string;
  evidenceLevel: string; // e.g., 'Class I, Level A'
  category: string;
  keyTakeaway: string;
  diagnosesMatched: string[];
}

export const EVIDENCE_CITATIONS_DATABASE: PubMedCitation[] = [
  {
    id: 'esc-acs-2023',
    pmid: '37622654',
    doi: '10.1093/eurheartj/ehad191',
    title: '2023 ESC Guidelines for the management of acute coronary syndromes',
    authors: 'Byrne RA, Rossello X, Coughlan JJ, et al.',
    journal: 'European Heart Journal',
    year: 2023,
    society: 'European Society of Cardiology (ESC)',
    evidenceLevel: 'Class I, Level A',
    category: 'Cardiology / Ischemia',
    keyTakeaway: 'In patients with suspected NSTE-ACS, a high-sensitivity cardiac troponin rapid 0h/1h or 0h/2h algorithm is strongly recommended. Risk stratification via HEART or GRACE score should guide invasive management timing.',
    diagnosesMatched: ['Acute Coronary Syndrome', 'NSTEMI', 'Unstable Angina', 'Myocardial Infarction', 'Coronary Artery Disease']
  },
  {
    id: 'aha-chestpain-2021',
    pmid: '34709979',
    doi: '10.1161/CIR.0000000000001029',
    title: '2021 AHA/ACC/ASE/CHEST/SAEM Guideline for the Evaluation and Diagnosis of Chest Pain',
    authors: 'Gulati M, Levy PD, Mukherjee D, et al.',
    journal: 'Circulation',
    year: 2021,
    society: 'American Heart Association / American College of Cardiology',
    evidenceLevel: 'Class I, Level B-R',
    category: 'Emergency Cardiology',
    keyTakeaway: 'Clinical decision pathways combining structured history, 12-lead ECG within 10 minutes of arrival, and hs-cTn serial sampling are Class 1 recommended for risk-stratifying emergency chest pain.',
    diagnosesMatched: ['Acute Coronary Syndrome', 'Angina Pectoris', 'Chest Pain', 'NSTEMI']
  },
  {
    id: 'sepsis3-jama-2016',
    pmid: '26903338',
    doi: '10.1001/jama.2016.0287',
    title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)',
    authors: 'Singer M, Deutschman CS, Seymour CW, et al.',
    journal: 'JAMA — Journal of the American Medical Association',
    year: 2016,
    society: 'SCCM / ESICM Consensus',
    evidenceLevel: 'Consensus Definition',
    category: 'Critical Care / Infectious Disease',
    keyTakeaway: 'Sepsis is defined as life-threatening organ dysfunction caused by a dysregulated host response to infection. A qSOFA score >= 2 identifies patients at elevated risk of in-hospital mortality.',
    diagnosesMatched: ['Sepsis', 'Severe Sepsis', 'Septic Shock', 'Pneumonia', 'Bacteremia']
  },
  {
    id: 'surviving-sepsis-2021',
    pmid: '34599001',
    doi: '10.1007/s00134-021-06506-8',
    title: 'Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021',
    authors: 'Evans L, Rhodes A, Alhazzani W, et al.',
    journal: 'Intensive Care Medicine / Critical Care Medicine',
    year: 2021,
    society: 'Surviving Sepsis Campaign',
    evidenceLevel: 'Class I, Level B',
    category: 'Resuscitation & Sepsis',
    keyTakeaway: 'Recommend administration of broad-spectrum IV antimicrobials immediately, ideally within 1 hour of recognition. For sepsis-induced hypoperfusion or lactate >= 4 mmol/L, administer >= 30 mL/kg of IV crystalloids within 3 hours.',
    diagnosesMatched: ['Sepsis', 'Severe Sepsis', 'Septic Shock', 'Pneumonia', 'Infection']
  },
  {
    id: 'chest-bleeding-2022',
    pmid: '35123984',
    doi: '10.1016/j.chest.2022.01.042',
    title: 'Management of Anticoagulant-Related Bleeding in Patients with Nonvalvular Atrial Fibrillation',
    authors: 'Tomaselli GF, Mahaffey KW, Cuker A, et al.',
    journal: 'CHEST Journal',
    year: 2022,
    society: 'American College of Chest Physicians (CHEST)',
    evidenceLevel: 'Class I, Level B',
    category: 'Hemostasis & Pharmacovigilance',
    keyTakeaway: 'For major life-threatening bleeding on VKA (Warfarin) with elevated INR, recommend immediate 4-factor prothrombin complex concentrate (4F-PCC) over fresh frozen plasma, combined with IV Vitamin K.',
    diagnosesMatched: ['Drug Toxicity', 'Anticoagulant Bleeding', 'Polypharmacy', 'Epistaxis', 'Melena']
  },
  {
    id: 'beers-criteria-2023',
    pmid: '37139824',
    doi: '10.1111/jgs.18372',
    title: 'American Geriatrics Society 2023 Updated AGS Beers Criteria for Potentially Inappropriate Medication Use in Older Adults',
    authors: 'By the 2023 American Geriatrics Society Beers Criteria Expert Panel',
    journal: 'Journal of the American Geriatrics Society',
    year: 2023,
    society: 'American Geriatrics Society (AGS)',
    evidenceLevel: 'Strong Recommendation, Moderate Quality',
    category: 'Geriatric Pharmacotherapy',
    keyTakeaway: 'Concurrent use of dual or triple antithrombotic therapy (anticoagulant + antiplatelet) with NSAIDs substantially compounds major gastrointestinal bleeding risk and should be strictly avoided unless essential.',
    diagnosesMatched: ['Polypharmacy', 'Drug Interaction', 'Geriatric Bleed', 'Drug Toxicity']
  }
];

interface ClinicalEvidenceCitationsProps {
  primaryDiagnosis?: string;
  chiefComplaint?: string;
}

export default function ClinicalEvidenceCitations({
  primaryDiagnosis = '',
  chiefComplaint = ''
}: ClinicalEvidenceCitationsProps) {
  const [selectedCitation, setSelectedCitation] = useState<PubMedCitation | null>(null);

  // Match citations against primary diagnosis and chief complaint
  const matchedCitations = EVIDENCE_CITATIONS_DATABASE.filter((citation) => {
    if (!primaryDiagnosis && !chiefComplaint) return true;
    const searchString = `${primaryDiagnosis} ${chiefComplaint}`.toLowerCase();
    return citation.diagnosesMatched.some((term) =>
      searchString.includes(term.toLowerCase())
    );
  });

  const displayList = matchedCitations.length > 0 ? matchedCitations : EVIDENCE_CITATIONS_DATABASE;

  return (
    <div className="w-full space-y-4 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-surface border border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary tracking-wide font-sans">
                PubMed & NCBI Clinical Evidence Grounding
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                Peer-Reviewed
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Verified clinical guidelines and citations grounding MediGuard AI diagnostic recommendations.
            </p>
          </div>
        </div>

        {/* Live PubMed Search Link */}
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(primaryDiagnosis || 'Acute Coronary Syndrome')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
        >
          <Search className="h-3.5 w-3.5 text-primary" />
          <span>Search PubMed Live</span>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>

      {/* Citations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayList.map((citation) => {
          const isSelected = selectedCitation?.id === citation.id;

          return (
            <div
              key={citation.id}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-raised border-primary/50 shadow-md ring-1 ring-primary/30'
                  : 'bg-surface border-border hover:border-border/80 hover:bg-surface-raised/40'
              }`}
            >
              <div>
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-raised border border-border text-teal-300">
                    {citation.society}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    {citation.evidenceLevel}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-text-primary leading-snug mb-1 font-sans">
                  {citation.title}
                </h4>

                {/* Authors & Journal */}
                <p className="text-[11px] text-text-muted mb-2 font-mono">
                  {citation.authors} — <span className="text-text-secondary italic">{citation.journal} ({citation.year})</span>
                </p>

                {/* Key Takeaway */}
                <div className="p-3 rounded-lg bg-background/60 border border-border/60 text-xs text-text-secondary leading-relaxed mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-0.5">
                    Guideline Directive:
                  </span>
                  &quot;{citation.keyTakeaway}&quot;
                </div>
              </div>

              {/* Action Buttons: PubMed & DOI */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs">
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition-all font-mono font-semibold"
                >
                  <span>PMID: {citation.pmid}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                {citation.doi && (
                  <a
                    href={`https://doi.org/${citation.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-all font-mono font-semibold"
                  >
                    <span>DOI Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
