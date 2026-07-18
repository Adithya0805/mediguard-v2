'use client';

import React, { useEffect, useState } from 'react';
import { getRagStatus, runRagIngestion, RagStatusResponse } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Database, RefreshCw, AlertTriangle, CheckCircle, Info, Play, Network, HelpCircle
} from 'lucide-react';

export default function CitationsPanel() {
  const [statusData, setStatusData] = useState<RagStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestMode, setIngestMode] = useState<'quick' | 'priority' | 'full'>('quick');

  const fetchStatus = async (showToast = false) => {
    setIsLoading(true);
    try {
      const data = await getRagStatus();
      setStatusData(data);
      if (showToast) {
        toast.success('RAG Knowledge Base status refreshed.');
      }
    } catch (err: any) {
      console.error('Failed to retrieve RAG status metrics', err);
      toast.error('Unable to fetch vector database status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTriggerIngest = async () => {
    if (isIngesting) return;
    setIsIngesting(true);
    toast.info(`Triggering background ingestion for topic profile: ${ingestMode.toUpperCase()}...`);

    try {
      const result = await runRagIngestion(ingestMode);
      toast.success(result.message || 'Ingestion pipeline launched successfully.');
      // Refresh status after a slight delay
      setTimeout(() => {
        fetchStatus();
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start RAG ingestion pipeline.');
    } finally {
      setIsIngesting(false);
    }
  };

  const isOnline = statusData?.status === 'online';

  return (
    <div className="p-6 rounded-2xl bg-[#111827] border border-border/80 flex flex-col gap-6 text-left shadow-xl">
      {/* Title Block */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2.5">
          <Database className="h-5.5 w-5.5 text-[#0d9488]" />
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white leading-tight">
              RAG Knowledge Base Control
            </h2>
            <span className="text-[10px] text-text-muted font-mono uppercase mt-0.5">
              Vector Database Indexes & PubMed Citations Engine
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchStatus(true)}
            disabled={isLoading}
            title="Refresh database stats"
            className="p-1.5 rounded-lg border border-border hover:bg-white/5 transition-colors text-text-secondary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
            isOnline 
              ? 'bg-success/10 border-success/20 text-success shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
              : 'bg-danger/10 border-danger/20 text-danger'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-success animate-ping' : 'bg-danger'}`} />
            {isOnline ? 'Online' : 'Offline / Mock Mode'}
          </span>
        </div>
      </div>

      {/* Grid Stats Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PubMed Namespace */}
        <div className="p-4 rounded-xl bg-background/40 border border-border/60 flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">PubMed namespace</span>
            <Network className="h-4 w-4 text-[#0d9488]/70" />
          </div>
          <div className="mt-2 text-left">
            <div className="text-2xl font-bold font-mono text-white">
              {statusData?.namespaces['pubmed-medical-kb']?.vector_count ?? 24}
            </div>
            <span className="text-[10px] text-text-secondary mt-1 block leading-normal">
              PubMed Peer-Reviewed vectors index.
            </span>
          </div>
        </div>

        {/* Manual Guideline Namespace */}
        <div className="p-4 rounded-xl bg-background/40 border border-border/60 flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Clinical guidelines namespace</span>
            <FileText className="h-4 w-4 text-accent/70" />
          </div>
          <div className="mt-2 text-left">
            <div className="text-2xl font-bold font-mono text-white">
              {statusData?.namespaces['medical-kb']?.vector_count ?? 50}
            </div>
            <span className="text-[10px] text-text-secondary mt-1 block leading-normal">
              Local medical guidelines & rules.
            </span>
          </div>
        </div>

        {/* Vector Properties */}
        <div className="p-4 rounded-xl bg-background/40 border border-border/60 flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Model specification</span>
            <Cpu className="h-4 w-4 text-[#818cf8]/70" />
          </div>
          <div className="mt-2 text-left">
            <div className="text-sm font-semibold font-mono text-white uppercase truncate">
              multilingual-e5-large
            </div>
            <span className="text-[10px] text-text-secondary mt-1 block leading-normal">
              Dimensions: {statusData?.dimension ?? 1024} | Cosine metrics
            </span>
          </div>
        </div>
      </div>

      {/* RAG Information block */}
      <div className="p-4 rounded-xl bg-background/50 border border-border/50 flex gap-3 text-left">
        <Info className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-white">Dual-Namespace Context Retrieval</span>
          <p className="text-text-secondary leading-relaxed">
            The MediGuard V2 retriever queries both namespaces in parallel. Clinical Reference Guidelines represent conservative institutional rules, while PubMed Literature fetches clinical papers with a <strong>1.05x similarity boost</strong>. Only articles scoring &ge; 0.72 are referenced by agents.
          </p>
        </div>
      </div>

      {/* Ingestion Control Block */}
      <div className="p-5 rounded-xl bg-[#090d16] border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col text-left max-w-md">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            PubMed Literature Sync Ingestion
          </span>
          <p className="text-[11px] text-text-muted leading-relaxed mt-1">
            Trigger a background PubMed search and embeddings generation job. The sync job fetches fresh clinical literature abstracts, splits them, computes E5 embeddings, and indexes them. Emojis are stripped from logs to prevent Windows shell encoding errors.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <select
            value={ingestMode}
            disabled={isIngesting}
            onChange={(e) => setIngestMode(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#111827] border border-border text-white text-xs focus:border-[#0d9488] focus:outline-none disabled:opacity-50 font-mono"
          >
            <option value="quick">QUICK (First 2 topics, max 1 doc)</option>
            <option value="priority">PRIORITY (High priority topics, max 3 docs)</option>
            <option value="full">FULL (All 23 topics, max 5 docs)</option>
          </select>
          
          <button
            onClick={handleTriggerIngest}
            disabled={isIngesting}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0d9488] text-white hover:bg-[#0d9488]/90 text-xs font-bold uppercase transition-all shadow-[0_0_12px_rgba(13,148,136,0.2)] disabled:opacity-50 focus:outline-none"
          >
            {isIngesting ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Running Sync...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Sync Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
