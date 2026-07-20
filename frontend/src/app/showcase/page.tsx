'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Zap, 
  ClipboardList, 
  Activity, 
  Search, 
  Pill, 
  FileText, 
  Cpu, 
  Database as DbIcon, 
  Server, 
  Layers, 
  ShieldCheck, 
  GitBranch, 
  Radio, 
  BarChart2, 
  Mic, 
  BookOpen, 
  Lock, 
  Play, 
  Github, 
  Mail, 
  Linkedin, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  GraduationCap,
  MapPin,
  Briefcase
} from 'lucide-react';

// Count-up helper component
const CountUp = ({ to, duration = 2 }: { to: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = to;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20);
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [to, duration]);

  return <span>{count}</span>;
};

export default function ShowcasePage() {
  // Accordion state for Section 6 (Challenges)
  const [expandedChallenge, setExpandedChallenge] = useState<number | null>(null);

  const toggleChallenge = (index: number) => {
    setExpandedChallenge(prev => prev === index ? null : index);
  };

  const agents = [
    {
      number: '1',
      name: 'Intake Agent',
      icon: ClipboardList,
      model: 'Claude 3 Haiku',
      speed: '~8 seconds',
      description: 'Parses patient data from voice, typed input, or FHIR EHR import into structured clinical format. Detects red flags. Normalizes informal terms to clinical equivalents.',
      tags: ['NLP', 'Voice', 'FHIR']
    },
    {
      number: '2',
      name: 'Symptom Agent',
      icon: Activity,
      model: 'Claude 3 Sonnet',
      speed: '~12 seconds',
      description: 'Deep symptom analysis with severity scoring, ICD-10 mapping, and emergency triage. Retrieves supporting evidence from 500+ PubMed articles via RAG.',
      tags: ['RAG', 'ICD-10', 'Triage']
    },
    {
      number: '3',
      name: 'Diagnosis Agent',
      icon: Search,
      model: 'Claude 3 Sonnet',
      speed: '~20 seconds',
      description: 'Generates ranked differential diagnosis with confidence scores. Every claim backed by peer-reviewed citations. Dual-RAG retrieval for maximum evidence coverage.',
      tags: ['DDx', 'PubMed', 'Citations']
    },
    {
      number: '4',
      name: 'Drug Check Agent',
      icon: Pill,
      model: 'Claude 3 Haiku',
      speed: '~8 seconds',
      description: 'Cross-references all medications against the OpenFDA database — 100,000+ real drug records. Detects interactions, contraindications, and allergy conflicts instantly.',
      tags: ['OpenFDA', 'Safety', 'Allergy']
    },
    {
      number: '5',
      name: 'Report Agent',
      icon: FileText,
      model: 'Claude 3 Sonnet',
      speed: '~15 seconds',
      description: 'Synthesizes all agent outputs into 4 PDF document types and a FHIR R4 compliant bundle. Includes PubMed citations and mandatory clinical disclaimers.',
      tags: ['PDF', 'FHIR R4', 'HL7']
    }
  ];

  const techStack = [
    {
      category: 'AI Layer',
      icon: Cpu,
      tech: [
        'AWS Bedrock (Claude 3 Sonnet + Haiku)',
        'LangGraph (StateGraph + Supervisor Pattern)',
        'LangChain + LangSmith Tracing',
        'Pinecone Vector Database (Hybrid Search)',
        'DeepEval Clinical Evaluation Framework'
      ],
      color: 'from-teal-500/20 to-teal-500/5 border-teal-500/30'
    },
    {
      category: 'Data Sources',
      icon: DbIcon,
      tech: [
        'PubMed E-utilities API (500+ parsed articles)',
        'OpenFDA API (100K+ real-time drug records)',
        'HAPI FHIR R4 Public Sandbox Servers',
        'Supabase PostgreSQL Database',
        'HL7 FHIR R4 Standardized Schemas'
      ],
      color: 'from-blue-500/20 to-blue-500/5 border-blue-500/30'
    },
    {
      category: 'Backend Architecture',
      icon: Server,
      tech: [
        'Python 3.11 + FastAPI async framework',
        'LangGraph Orchestrator & State store',
        'WebSockets for real-time agent telemetry stream',
        'JWT + bcrypt robust Authentication system',
        'Railway Cloud Deployment (Dockerized container)'
      ],
      color: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30'
    },
    {
      category: 'Frontend Portal',
      icon: Layers,
      tech: [
        'Next.js 14 Framework (App Router, SSR/SSG)',
        'TypeScript (Strict Type-Safety)',
        'Tailwind CSS + shadcn/ui components',
        'Zustand Client-State manager',
        'Recharts Dashboard + Framer Motion animations',
        'Vercel Global Edge CDN'
      ],
      color: 'from-purple-500/20 to-purple-500/5 border-purple-500/30'
    },
    {
      category: 'Security & Compliance',
      icon: Lock,
      tech: [
        'Supabase Row Level Security (RLS)',
        'Multi-tenant hospital / clinic isolation',
        'JWT token clinical validation filters',
        'Rate-limiting middleware (IP-based rules)',
        'Immutable, append-only HIPAA action audit logs'
      ],
      color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30'
    },
    {
      category: 'DevOps & Pipeline',
      icon: GitBranch,
      tech: [
        'GitHub Actions automated CI/CD flow',
        'DeepEval semantic safety gate',
        'Docker optimized multi-stage builds',
        'LangSmith observability & prompt versioning',
        'Structured Python logging (JSON-formatted)'
      ],
      color: 'from-slate-500/20 to-slate-500/5 border-slate-500/30'
    }
  ];

  const features = [
    { day: 'DAY 1', name: 'WebSocket Streaming', desc: '5 agents stream live status in real time', icon: Radio, tags: ['WebSocket', 'FastAPI'] },
    { day: 'DAY 2', name: 'FDA Drug Verification', desc: '100,000+ real FDA drug records checked per session', icon: Pill, tags: ['OpenFDA', 'Pharmacology'] },
    { day: 'DAY 3', name: 'Clinical Auth', desc: '3-factor login with institution code and audit trail', icon: Lock, tags: ['JWT', 'HIPAA-aware'] },
    { day: 'DAY 4', name: 'FHIR Patient Import', desc: 'Import real EHR data from live FHIR servers', icon: ClipboardList, tags: ['FHIR R4', 'HL7'] },
    { day: 'DAY 5', name: 'Analytics Dashboard', desc: '8 live charts from real Supabase clinical data', icon: BarChart2, tags: ['Recharts', 'Aggregation'] },
    { day: 'DAY 6', name: 'Voice Intake', desc: 'Speak patient details — AI fills the entire form', icon: Mic, tags: ['Web Speech API', 'NLP'] },
    { day: 'DAY 7', name: 'AI Safety Evaluation', desc: '50 test cases gate every deployment automatically', icon: ShieldCheck, tags: ['DeepEval', 'CI/CD'] },
    { day: 'DAY 8', name: 'PubMed Evidence Base', desc: '500+ peer-reviewed articles power every diagnosis', icon: BookOpen, tags: ['PubMed', 'RAG'] },
    { day: 'DAY 9', name: 'Hospital Isolation', desc: 'Database-level RLS keeps hospitals completely separate', icon: Lock, tags: ['PostgreSQL RLS', 'Multi-tenant'] },
    { day: 'DAY 10', name: 'Public Demo', desc: 'Anyone can try it live — no signup required', icon: Play, tags: ['Demo Mode', 'Public API'] }
  ];

  const challenges = [
    {
      title: 'Pipeline Race Condition',
      problem: 'Frontend navigated away before background report generation started. Sessions stuck in pending forever.',
      solution: 'Await 202 before navigation + auto-trigger useEffect on session page for any pending session.',
      result: 'Zero stuck sessions in production.'
    },
    {
      title: 'ISP CORS Blocking',
      problem: 'Railway backend blocked by JioFiber DNS overrides in India. Network error on every API call.',
      solution: 'Vercel edge rewrite proxy. All API traffic routes through Vercel\'s global edge network.',
      result: 'Zero connectivity issues globally.'
    },
    {
      title: 'JWT PDF Download',
      problem: 'window.open() new tabs don\'t carry Authorization headers. Every PDF download returned 401.',
      solution: 'Blob download with fetch() + Authorization header. No new tab. Direct download to device.',
      result: 'PDF download works on all browsers and devices.'
    },
    {
      title: 'PubMed Rate Limits',
      problem: 'NCBI blocks IPs making more than 3 requests per second without API key. Ingestion kept failing.',
      solution: 'Token bucket rate limiter — 0.34s enforced delay between every request. 1s between topics.',
      result: '500+ articles ingested with zero blocked requests.'
    },
    {
      title: 'Silent AI Regression',
      problem: 'Code changes could silently break AI clinical accuracy. No way to know until patient harmed.',
      solution: 'DeepEval pipeline with 20 curated test cases. Critical safety failures block deployment in CI/CD.',
      result: 'Every deploy is safety-validated before it goes live.'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-text-primary overflow-x-hidden font-sans scroll-smooth">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 1 — HERO
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen w-full flex flex-col justify-center items-center px-6 lg:px-16 text-center select-none">
        
        {/* Animated Teal Gradient Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(13,148,136,0.18),transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto flex flex-col items-center z-10">
          
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-mono uppercase tracking-wider mb-8"
          >
            Production-Grade Clinical AI
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl sm:text-8xl font-sans font-bold tracking-tight text-white leading-tight mb-4"
          >
            MediGuard V2
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl sm:text-2xl text-text-secondary max-w-2xl font-light mb-4"
          >
            Multi-Agent Clinical Decision Support System
          </motion.p>

          {/* Built by line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-sm font-mono text-primary font-semibold mb-12"
          >
            Built by Adithya Kuppusamy — AI Engineer, Tamil Nadu, India
          </motion.div>

          {/* Stats Row */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-3 gap-8 sm:gap-16 border-y border-border/40 py-8 px-12 mb-12 w-full max-w-2xl"
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-primary font-mono">
                <CountUp to={500} />+
              </span>
              <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-widest mt-2">Medical Articles</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-primary font-mono">
                <CountUp to={5} />
              </span>
              <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-widest mt-2">Specialist Agents</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-primary font-mono">
                <CountUp to={10} />
              </span>
              <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-widest mt-2">Production Features</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all font-semibold text-sm shadow-[0_0_20px_rgba(13,148,136,0.3)] hover:scale-[1.03]"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Live Demo</span>
            </Link>
            <a
              href="https://github.com/Adithya0805/mediguard-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised hover:scale-[1.03] transition-all font-semibold text-sm"
            >
              <Github className="h-4.5 w-4.5" />
              <span>GitHub</span>
            </a>
          </motion.div>

        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-text-muted">
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2 — THE PROBLEM
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border bg-surface/10 relative">
        <div className="max-w-6xl mx-auto text-left">
          
          <h2 className="text-3xl font-sans font-bold text-center text-white tracking-tight mb-16">
            The Problem MediGuard Solves
          </h2>

          <div className="grid md:grid-cols-2 gap-8 items-stretch mb-16">
            
            {/* Left Card — Red problem */}
            <div className="p-8 rounded-2xl bg-danger/5 border border-danger/25 flex flex-col gap-5 text-left relative overflow-hidden group hover:border-danger/40 transition-colors">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-danger/10 blur-xl group-hover:scale-125 transition-transform" />
              <div className="h-10 w-10 rounded-lg bg-danger/10 border border-danger/25 text-danger flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-danger font-sans tracking-wide">The Clinical Bottleneck</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Emergency physicians see 30+ patients per shift. Manual differential diagnosis takes critical time. Drug interactions get missed. Clinical documentation is incomplete before AI analysis even begins.
              </p>
            </div>

            {/* Right Card — Teal solution */}
            <div className="p-8 rounded-2xl bg-primary/5 border border-primary/25 flex flex-col gap-5 text-left relative overflow-hidden group hover:border-primary/45 transition-colors">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-xl group-hover:scale-125 transition-transform" />
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/25 text-primary flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-primary font-sans tracking-wide">The Multi-Agent Remedy</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                MediGuard V2 gives every physician 5 specialist AI agents analyzing each patient simultaneously — voice input, real FDA drug data, peer-reviewed evidence — complete in under 60 seconds.
              </p>
            </div>

          </div>

          {/* Impact stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-border/40 pt-12">
            <div className="flex flex-col p-4 rounded-xl bg-background/50 border border-border/60">
              <span className="text-2xl font-bold text-primary font-mono">&lt; 60s</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Per Full Analysis</span>
            </div>
            <div className="flex flex-col p-4 rounded-xl bg-background/50 border border-border/60">
              <span className="text-2xl font-bold text-primary font-mono">500+</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Peer-Reviewed Sources</span>
            </div>
            <div className="flex flex-col p-4 rounded-xl bg-background/50 border border-border/60">
              <span className="text-2xl font-bold text-primary font-mono">100K+</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">FDA Drug Records</span>
            </div>
            <div className="flex flex-col p-4 rounded-xl bg-background/50 border border-border/60">
              <span className="text-2xl font-bold text-primary font-mono">FHIR R4</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Compliant Output</span>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 3 — 5-AGENT PIPELINE
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          
          <h2 className="text-3xl font-sans font-bold text-center text-white tracking-tight mb-20">
            The 5-Agent Clinical Pipeline
          </h2>

          <div className="relative border-l-2 border-primary/20 pl-8 ml-4 flex flex-col gap-16 text-left">
            
            {agents.map((agent, idx) => {
              const IconComponent = agent.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6 }}
                  className="relative group"
                >
                  
                  {/* Timeline bullet node */}
                  <div className="absolute -left-[53px] top-1.5 h-10 w-10 rounded-full bg-[#0a0f1e] border-2 border-primary text-primary flex items-center justify-center font-mono font-bold text-sm shadow-[0_0_12px_rgba(13,148,136,0.3)] group-hover:scale-110 transition-transform">
                    {agent.number}
                  </div>

                  {/* Card container */}
                  <div className="p-6 rounded-2xl bg-surface border border-border group-hover:border-primary/20 transition-all duration-300 shadow-xl flex flex-col gap-4">
                    
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-primary/10 border border-primary/20 text-primary">
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>
                        <h3 className="font-bold text-lg text-text-primary">{agent.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                          {agent.model}
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-accent/10 border border-accent/20 text-accent">
                          {agent.speed}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-text-secondary leading-relaxed font-light">
                      {agent.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                      {agent.tags.map((t, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded-full bg-slate-900 border border-border/80 text-[9px] font-mono font-semibold text-text-muted uppercase">
                          {t}
                        </span>
                      ))}
                    </div>

                  </div>

                </motion.div>
              );
            })}

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 4 — TECH STACK
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border bg-surface/10">
        <div className="max-w-6xl mx-auto">
          
          <h2 className="text-3xl font-sans font-bold text-center text-white tracking-tight mb-20">
            Enterprise Technology Stack
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {techStack.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} border shadow-xl flex flex-col text-left hover:scale-[1.02] transition-transform duration-300`}
                >
                  <div className="h-10 w-10 rounded-lg bg-background/80 border border-border flex items-center justify-center mb-5 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base text-text-primary tracking-wide mb-4 border-b border-border/40 pb-2">
                    {item.category}
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {item.tech.map((t, tIdx) => (
                      <li key={tIdx} className="text-xs text-text-secondary leading-relaxed flex items-start gap-2 font-mono">
                        <span className="text-primary mt-1">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 5 — 10 FEATURE HIGHLIGHTS
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-20">
            <h2 className="text-3xl font-sans font-bold text-white tracking-tight">10 Production Features</h2>
            <p className="text-sm text-text-secondary mt-3 uppercase tracking-widest font-mono">One per day. Ten days. Fully deployed.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={idx}
                  className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/20 transition-all flex flex-col gap-4 text-left shadow-lg group hover:shadow-[0_0_15px_rgba(13,148,136,0.03)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-[8px] font-mono font-bold text-primary uppercase">
                      {feat.day}
                    </span>
                    <Icon className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors" />
                  </div>
                  
                  <div className="flex flex-col gap-1.5 flex-1">
                    <h3 className="font-bold text-xs text-text-primary tracking-wide line-clamp-1">{feat.name}</h3>
                    <p className="text-[10px] text-text-secondary leading-relaxed font-light line-clamp-3">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                    {feat.tags.map((t, tIdx) => (
                      <span key={tIdx} className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-slate-900 border border-border/80 text-text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 6 — ENGINEERING CHALLENGES (ACCORDION)
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border bg-surface/10">
        <div className="max-w-4xl mx-auto">
          
          <h2 className="text-3xl font-sans font-bold text-center text-white tracking-tight mb-20">
            Real Engineering Challenges — Real Solutions
          </h2>

          <div className="flex flex-col gap-4">
            
            {challenges.map((c, idx) => {
              const isExpanded = expandedChallenge === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl bg-surface border border-border shadow-lg overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleChallenge(idx)}
                    className="flex justify-between items-center w-full p-6 text-left font-bold text-sm sm:text-base text-text-primary select-none focus:outline-none hover:bg-background/20 transition-colors"
                  >
                    <span>{idx + 1}. {c.title}</span>
                    {isExpanded ? <ChevronUp className="h-4.5 w-4.5 text-primary" /> : <ChevronDown className="h-4.5 w-4.5 text-text-secondary" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-border/40 grid gap-4 text-xs sm:text-sm">
                          
                          <div className="flex flex-col gap-1 text-left">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-danger font-semibold">Problem</span>
                            <p className="text-text-secondary leading-relaxed bg-danger/5 border border-danger/10 p-3 rounded-lg">
                              {c.problem}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1 text-left">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">Solution</span>
                            <p className="text-text-secondary leading-relaxed bg-primary/5 border border-primary/10 p-3 rounded-lg">
                              {c.solution}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1 text-left">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-success font-semibold">Result</span>
                            <p className="text-text-secondary leading-relaxed bg-success/5 border border-success/10 p-3 rounded-lg">
                              {c.result}
                            </p>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 7 — ABOUT THE ENGINEER
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          
          <h2 className="text-3xl font-sans font-bold text-center text-white tracking-tight mb-20">
            About the Engineer
          </h2>

          <div className="grid lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Left Column — Profile Card */}
            <div className="lg:col-span-5 p-8 rounded-3xl bg-surface border border-border flex flex-col items-center justify-between text-center shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-colors duration-300">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-xl group-hover:scale-125 transition-transform" />
              
              <div className="flex flex-col items-center gap-5 w-full">
                {/* Avatar */}
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/30 to-indigo-500/30 border border-primary flex items-center justify-center text-3xl font-bold text-white shadow-xl relative z-10">
                  AK
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-text-primary tracking-wide">Adithya Kuppusamy</h3>
                  <span className="text-xs font-mono text-primary font-semibold">AI & Data Science Engineer</span>
                </div>

                {/* Details list */}
                <div className="w-full flex flex-col gap-3 border-y border-border/40 py-6 my-2 text-left text-xs text-text-secondary font-mono">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <span>🎓 B.Tech AI & DS — 2025</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span>📍 Tamil Nadu, India</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-primary shrink-0" />
                    <span>💼 Open to ML/AI Engineer roles</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <a href="https://adithyaai.is-cool.dev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors hover:underline">
                      🌐 adithyaai.is-cool.dev
                    </a>
                  </div>
                </div>
              </div>

              {/* Social links row */}
              <div className="flex flex-wrap gap-3 justify-center w-full mt-4">
                <a
                  href="https://github.com/Adithya0805"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-[10px] font-mono hover:text-text-primary hover:bg-surface-raised transition-colors"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span>GitHub</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/adithya-kuppusamy-854746270"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-[10px] font-mono hover:text-text-primary hover:bg-surface-raised transition-colors"
                >
                  <Linkedin className="h-3.5 w-3.5 text-[#0a66c2]" />
                  <span>LinkedIn</span>
                </a>
              </div>

            </div>

            {/* Right Column — Tags and Quote */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-8 text-left">
              
              <div className="flex flex-col gap-6">
                
                {/* AI/ML */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">AI / ML Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {['LangGraph', 'LangChain', 'AWS Bedrock', 'RAG Systems', 'Multi-Agent AI', 'Vector Databases', 'Prompt Engineering', 'DeepEval'].map((t, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Backend */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">Backend Architecture</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Python', 'FastAPI', 'PostgreSQL', 'Supabase', 'REST APIs', 'WebSockets', 'Docker'].map((t, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Frontend */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Frontend Engineering</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Next.js 14', 'TypeScript', 'React', 'Tailwind CSS', 'Zustand'].map((t, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-semibold text-purple-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* DevOps */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">DevOps & Tooling</h4>
                  <div className="flex flex-wrap gap-2">
                    {['GitHub Actions', 'Railway', 'Vercel', 'CI/CD', 'LangSmith'].map((t, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-slate-800 border border-border/80 text-[10px] font-semibold text-text-secondary font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Quote Block */}
              <div className="border-l-4 border-primary pl-5 italic text-sm text-text-secondary leading-relaxed my-2 font-light">
                &quot;MediGuard V2 was built layer by layer — one production feature per day for 10 days. Every architectural decision reflects real clinical requirements, not tutorial patterns.&quot;
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 8 — FINAL CTA & FOOTER
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-16 px-6 border-t border-border bg-[#070a14] relative">
        
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          
          <div className="text-center max-w-xl mb-16">
            <h2 className="text-3xl font-sans font-bold text-white tracking-tight">Try It. Hire Me. Build Together.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch mb-20 w-full text-left">
            
            {/* Column 1 — Demo */}
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between items-start gap-6 hover:border-primary/20 transition-all shadow-xl group">
              <div className="flex flex-col gap-3">
                <Play className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-base text-text-primary">Run a Live Demo</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-light">
                  Watch 5 AI agents analyze a cardiac emergency in under 60 seconds.
                </p>
              </div>
              <Link 
                href="/demo"
                className="w-full text-center px-4 py-2.5 rounded-lg bg-primary text-text-primary hover:bg-primary/95 font-semibold text-xs transition-colors"
              >
                Open Demo
              </Link>
            </div>

            {/* Column 2 — Code */}
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between items-start gap-6 hover:border-primary/20 transition-all shadow-xl group">
              <div className="flex flex-col gap-3">
                <Github className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-base text-text-primary">View Source Code</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-light">
                  Full repository with docs, deployment guides, and architecture decisions.
                </p>
              </div>
              <a 
                href="https://github.com/Adithya0805/mediguard-v2"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center px-4 py-2.5 rounded-lg bg-surface-raised border border-border text-text-primary hover:bg-surface transition-colors font-semibold text-xs"
              >
                GitHub Repo
              </a>
            </div>

            {/* Column 3 — Connect */}
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between items-start gap-6 hover:border-primary/20 transition-all shadow-xl group">
              <div className="flex flex-col gap-3">
                <Mail className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-base text-text-primary">Let&apos;s Work Together</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-light">
                  Seeking ML/AI Engineer roles in India. Open to remote opportunities globally.
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <a 
                  href="https://www.linkedin.com/in/adithya-kuppusamy-854746270"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-2.5 rounded-lg bg-surface-raised border border-border text-[#0a66c2] hover:bg-surface transition-colors font-semibold text-[10px]"
                >
                  LinkedIn
                </a>
                <a 
                  href="mailto:adithyakup2004@gmail.com"
                  className="flex-1 text-center px-3 py-2.5 rounded-lg bg-primary text-text-primary hover:bg-primary/95 transition-colors font-semibold text-[10px]"
                >
                  Email
                </a>
              </div>
            </div>

          </div>

          {/* Footer block */}
          <div className="w-full border-t border-border/40 pt-12 text-center flex flex-col items-center gap-4 text-xs font-mono text-text-secondary">
            <div>
              <b>MediGuard V2</b> | Built by Adithya Kuppusamy | 2025
            </div>
            
            <div className="text-[10px] text-text-muted tracking-wider">
              Python · FastAPI · LangGraph · AWS Bedrock · Next.js · Supabase · Pinecone · OpenFDA · FHIR R4
            </div>

            <p className="text-[10px] text-text-muted italic max-w-xl leading-relaxed mt-2 border border-border/40 p-3.5 rounded-xl bg-background/50">
              * <b>CLINICAL DISCLAIMER:</b> Portfolio project demonstrating production AI engineering. Not certified for clinical use. All simulation outputs must be evaluated by licensed medical personnel prior to any clinical application.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}
