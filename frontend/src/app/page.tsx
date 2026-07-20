'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ChevronDown, 
  BrainCircuit, 
  FileCheck, 
  ShieldAlert, 
  History, 
  Lock,
  Stethoscope,
  Database,
  FileHeart
} from 'lucide-react';
import UrgencyBadge from '@/components/shared/UrgencyBadge';

export default function LandingPage() {
  const steps = [
    { number: '01', name: 'Intake Parsing', desc: 'LLM translates raw complaints & history to clinical syntax' },
    { number: '02', name: 'Symptom NLP', desc: 'Queries Pinecone RAG databases for diagnostic relevance' },
    { number: '03', name: 'Differential Diagnosis', desc: 'Balanced & reasoning models compile ranked DDx candidates' },
    { number: '04', name: 'Drug Interaction', desc: 'Screens active drugs for contraindications & incompatibilities' },
    { number: '05', name: 'Clinical Reports', desc: 'Saves visual PDF and HL7 FHIR R4 JSON bundles' }
  ];

  const capabilities = [
    {
      icon: BrainCircuit,
      title: 'Multi-Agent AI Collaboration',
      desc: '5 collaborative specialists running in parallel graph workflows built with LangGraph orchestrations.'
    },
    {
      icon: Stethoscope,
      title: 'Ranked Differential Diagnosis',
      desc: 'Dynamic confidence calculations, ICD-10 diagnostic coding, and structured clinical reasoning logs.'
    },
    {
      icon: ShieldAlert,
      title: 'Pharmacological Screening',
      desc: 'Advanced screening checks for drug-drug interactions and drug-allergy compatibility.'
    },
    {
      icon: FileHeart,
      title: 'Standard FHIR R4 Bundles',
      desc: 'Automatically packages clinical reports into standards-compliant HL7 FHIR documents for EHR exchange.'
    },
    {
      icon: Database,
      title: 'Evidence-Based RAG',
      desc: 'Dual-pass retrieval augmented search querying vector databases containing verified medical reference databases.'
    },
    {
      icon: FileCheck,
      title: 'Physician-Ready PDF Reports',
      desc: 'Visual clinical reports carrying watermarks, page border banners, and structured details.'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0f1e] overflow-x-hidden font-sans">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          HERO SECTION
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen w-full flex flex-col justify-center px-6 lg:px-16 pt-20">
        
        {/* Subtle Background Radial Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(13,148,136,0.15),transparent_60%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Text Block */}
          <div className="lg:col-span-7 flex flex-col text-left">
            
            {/* Pulsing Chip */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wide uppercase mb-6"
            >
              <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
              Enterprise Multi-Agent CDSS v2.0
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-bold tracking-tight text-text-primary leading-[1.1] mb-6"
            >
              Clinical Intelligence.<br/>
              <span className="text-primary">Physician Trusted.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-text-secondary max-w-xl leading-relaxed mb-8"
            >
              MediGuard V2 leverages collaborative multi-agent AI pipelines to deliver ranked differential diagnosis, real-time drug interaction screening, and HL7 FHIR compliant documentation in seconds.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4 items-center"
            >
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all font-semibold text-sm shadow-[0_0_15px_rgba(13,148,136,0.3)] hover:scale-[1.02]"
              >
                <span>Run Public Demo</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <Link
                href="/showcase"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-all font-semibold text-sm hover:scale-[1.02]"
              >
                <span>Project Showcase</span>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center text-xs text-text-muted hover:text-primary transition-colors w-full mt-2 font-mono"
              >
                Launch Clinical Portal (Login Required) &rarr;
              </Link>
            </motion.div>

          </div>

          {/* Right Floating Card Previews */}
          <div className="lg:col-span-5 relative flex items-center justify-center h-[450px]">
            
            {/* Visual background rings */}
            <div className="absolute h-96 w-96 rounded-full border border-primary/5 scale-125 pointer-events-none" />
            <div className="absolute h-80 w-80 rounded-full border border-accent/10 scale-75 pointer-events-none" />
            
            {/* Card 1: Sample DDx (Floating) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 50, y: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute z-20 w-80 p-5 rounded-2xl bg-surface border border-border/80 shadow-2xl flex flex-col gap-4 text-left hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-secondary font-mono tracking-wider font-semibold uppercase">Diagnostic Suggestion</span>
                <UrgencyBadge urgency="high" size="sm" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-text-primary">Acute Coronary Syndrome</h3>
                <span className="text-xs font-mono text-primary mt-0.5">ICD-10: I24.9</span>
              </div>
              
              {/* Confidence Meter */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex justify-between text-[11px] font-semibold text-text-secondary font-mono">
                  <span>Pipeline Confidence</span>
                  <span className="text-success font-bold">87%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-[87%] bg-success rounded-full shadow-[0_0_8px_#10b981]" />
                </div>
              </div>
            </motion.div>

            {/* Card 2: Drug interaction warning */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: -60, y: 60 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="absolute z-10 w-72 p-4 rounded-xl bg-surface border border-danger/20 shadow-2xl flex flex-col gap-3 text-left bottom-6 left-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-danger font-mono font-bold tracking-wider uppercase">Contraindication</span>
                <span className="px-2 py-0.5 rounded text-[8px] bg-danger/10 border border-danger/20 text-danger uppercase font-mono font-bold">Severe</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary font-mono">Aspirin ↔ Warfarin</span>
                <p className="text-[10px] text-text-secondary leading-relaxed mt-1">
                  Co-administration dramatically increases bleeding hazards. Verify patient clinical profile.
                </p>
              </div>
            </motion.div>

          </div>

        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none text-text-muted">
          <span className="text-[10px] uppercase font-mono tracking-widest">Discover Platform</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          HOW IT WORKS (PIPELINE STEP TIMELINE)
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border bg-surface/30">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          
          <div className="text-center max-w-xl mb-16">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Workflow Engine</h2>
            <h3 className="text-3xl font-bold tracking-tight text-text-primary">5-Stage Agent Orchestration</h3>
            <p className="text-sm text-text-secondary leading-relaxed mt-4">
              Watch raw intake data travel through specialized clinical reasoning nodes, resolving into validated patient assessments.
            </p>
          </div>

          {/* Connected Step Nodes */}
          <div className="grid md:grid-cols-5 gap-8 items-start w-full relative">
            
            {/* Background connection line */}
            <div className="hidden md:block absolute top-6 left-12 right-12 h-0.5 bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 z-0" />

            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center relative z-10">
                <div className="h-12 w-12 rounded-full border-2 border-primary bg-[#0a0f1e] text-primary flex items-center justify-center font-mono font-bold text-sm shadow-[0_0_12px_rgba(13,148,136,0.2)]">
                  {step.number}
                </div>
                <h4 className="text-sm font-bold text-text-primary tracking-wide mt-4">{step.name}</h4>
                <p className="text-xs text-text-secondary leading-relaxed mt-2 max-w-[180px]">{step.desc}</p>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CAPABILITIES GRID
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-xl mx-auto mb-20">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent mb-3">Capabilities Grid</h2>
            <h3 className="text-3xl font-bold tracking-tight text-text-primary">Clinically Focused Architecture</h3>
            <p className="text-sm text-text-secondary leading-relaxed mt-4">
              MediGuard V2 is designed for precise, low-latency, HIPAA-traceable clinical support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capabilities.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="p-6 rounded-2xl bg-surface border border-border/80 text-left hover:border-primary/30 hover:shadow-[0_0_20px_rgba(13,148,136,0.05)] transition-all group duration-300"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold text-text-primary tracking-wide mb-3">{item.title}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TRUST & SECURE CLINICAL INFRASTRUCTURE
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border bg-surface/30">
        <div className="max-w-7xl mx-auto text-center">
          
          <div className="max-w-xl mx-auto mb-16">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Security & Auditing</h2>
            <h3 className="text-3xl font-bold tracking-tight text-text-primary">Built for Secure Clinical Environments</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            
            {/* Pillar 1 */}
            <div className="p-6 rounded-xl bg-background/50 border border-border flex flex-col gap-3">
              <div className="h-9 w-9 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center">
                <BrainCircuit className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">Evidence-Based RAG</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                All diagnostic logic references indexed vector catalogs, providing verifiable resources to reduce AI hallucination risks.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-xl bg-background/50 border border-border flex flex-col gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <History className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">HIPAA Action Auditing</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Every clinical assessment, retrieval trigger, and report generation is captured in audit logs for full traceability.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-xl bg-background/50 border border-border flex flex-col gap-3">
              <div className="h-9 w-9 rounded-full bg-success/10 border border-success/20 text-success flex items-center justify-center">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">Secure Clinical Guardrails</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Strict API validation boundaries and offline-first storage mocks keep sensitive patient datasets securely segmented.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          FOOTER
          ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-border bg-[#070b16]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col text-left">
            <span className="font-sans font-bold text-sm text-text-primary tracking-wide">
              MEDIGUARD <span className="text-primary text-[10px] uppercase font-semibold">Clinical Support v2</span>
            </span>
            <span className="text-[10px] text-text-muted mt-1">© 2026 MediGuard AI Inc. All rights reserved.</span>
          </div>

          <p className="text-[11px] text-text-secondary font-mono italic max-w-md text-left md:text-right leading-relaxed">
            * <b>CLINICAL DISCLAIMER:</b> This platform is designed solely for diagnostic decision support. All recommendations, drug screening checks, and clinical outputs must be evaluated by licensed medical personnel prior to patient treatment.
          </p>
        </div>
      </footer>

    </div>
  );
}
