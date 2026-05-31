'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PatientSession } from '@/types';
import { Brain, ArrowRight, PlayCircle, ShieldCheck, HeartPulse } from 'lucide-react';

interface AgentPipelineStatusProps {
  activeSessions: PatientSession[];
  onRefresh?: () => void;
}

export default function AgentPipelineStatus({ activeSessions, onRefresh }: AgentPipelineStatusProps) {
  const router = useRouter();

  const [simulatedNodeIndex, setSimulatedNodeIndex] = useState(0);

  // Auto-refresh hook triggered every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (onRefresh) {
        onRefresh();
      }
      // Rotate active nodes dynamically for visual pipeline feedback
      setSimulatedNodeIndex((prev) => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const pipelineNodes = [
    { label: 'Intake Parsing', agent: 'intake' },
    { label: 'Symptom RAG', agent: 'symptom' },
    { label: 'DDx Compilation', agent: 'diagnosis' },
    { label: 'Pharmacology', agent: 'drug_check' },
    { label: 'Synthesizing', agent: 'report' },
  ];

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6 text-left shadow-lg">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">Live AI Collaborative Pipelines</h3>
        </div>
        {activeSessions.length > 0 && (
          <span className="flex h-2 w-2 rounded-full bg-accent animate-ping shadow-[0_0_8px_#06b6d4]" />
        )}
      </div>

      {/* Pipeline visualizations */}
      <div className="flex flex-col gap-6">
        {activeSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted gap-2.5">
            <HeartPulse className="h-10 w-10 text-border animate-pulse" />
            <span className="text-sm font-semibold">No active pipelines running</span>
            <p className="text-xs max-w-sm leading-relaxed">
              All clinical agent graphs are currently idle. Start a new patient assessment intake session to initiate RAG retrieval runs.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {activeSessions.map((session) => {
              // Standard simulated pipeline mapping
              const activeNode = simulatedNodeIndex;

              return (
                <div 
                  key={session.id}
                  onClick={() => router.push(`/patient/${session.id}`)}
                  className="p-5 rounded-xl bg-background/50 border border-border/80 hover:border-primary/20 cursor-pointer transition-colors flex flex-col gap-5 text-left"
                >
                  {/* Session Context Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text-primary">{session.patient_name}</span>
                      <span className="text-[10px] font-mono text-text-secondary mt-0.5">Session ID: {session.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                      <span>View Live Case Tracker</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Horizontal Graph Pipeline Node Timeline */}
                  <div className="relative flex items-center justify-between mt-3 w-full">
                    
                    {/* Background track line */}
                    <div className="absolute left-6 right-6 h-0.5 bg-slate-800 z-0" />

                    {/* Animated Progress track line */}
                    <motion.div 
                      className="absolute left-6 h-0.5 bg-primary z-0"
                      initial={{ width: '0%' }}
                      animate={{ width: `${(activeNode / 4) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeInOut' }}
                      style={{ right: 'auto' }}
                    />

                    {pipelineNodes.map((node, nodeIdx) => {
                      const isCompleted = nodeIdx < activeNode;
                      const isActive = nodeIdx === activeNode;
                      
                      return (
                        <div key={nodeIdx} className="flex flex-col items-center gap-2 relative z-10">
                          {/* Circle Badge Indicator */}
                          <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${
                            isCompleted 
                              ? 'bg-primary border-primary text-text-primary' 
                              : isActive 
                              ? 'bg-surface-raised border-primary text-primary scale-110 shadow-[0_0_10px_var(--primary)] animate-pulse' 
                              : 'bg-surface-raised border-border text-text-muted'
                          }`}>
                            {isCompleted ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : isActive ? (
                              <PlayCircle className="h-4 w-4 animate-spin-slow" />
                            ) : (
                              <span className="font-mono text-xs font-bold">{nodeIdx + 1}</span>
                            )}
                          </div>

                          {/* Node label */}
                          <span className={`text-[10px] font-semibold tracking-wide whitespace-nowrap hidden sm:block ${
                            isActive ? 'text-primary' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                          }`}>
                            {node.label}
                          </span>
                        </div>
                      );
                    })}

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
