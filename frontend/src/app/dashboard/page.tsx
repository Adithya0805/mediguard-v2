'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentSessions from '@/components/dashboard/RecentSessions';
import { DashboardSkeleton } from '@/components/shared/Skeletons';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Analytics hooks & charts
import useAnalytics from '@/hooks/useAnalytics';
import AnomalyAlertBanner from '@/components/dashboard/AnomalyAlertBanner';
import DailyTrendChart from '@/components/dashboard/DailyTrendChart';
import AgentPerformanceChart from '@/components/dashboard/AgentPerformanceChart';
import DiagnosisPatternChart from '@/components/dashboard/DiagnosisPatternChart';
import DrugInteractionChart from '@/components/dashboard/DrugInteractionChart';
import DemographicsChart from '@/components/dashboard/DemographicsChart';

import { listSessions } from '@/lib/api';
import { PatientSession } from '@/types';
import { 
  Users, 
  CheckSquare, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  Plus,
  ShieldCheck,
  Activity,
  Cpu
} from 'lucide-react';

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [recentSessionsList, setRecentSessionsList] = useState<PatientSession[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Retrieve data using custom analytics hook
  const { data, isLoading, isRefreshing, error, refetch } = useAnalytics(days);

  // Fetch recent patient sessions
  const fetchRecentSessions = async () => {
    try {
      setRecentLoading(true);
      const response = await listSessions(10, 0);
      setRecentSessionsList(response.data || []);
    } catch (e) {
      console.error('Failed to retrieve recent sessions list', e);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSessions();
  }, []);

  const handleRefreshAll = () => {
    refetch();
    fetchRecentSessions();
  };

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  // Calculate critical case metric from overview breakdown safely
  const criticalCount = (data?.overview?.urgency_breakdown?.critical || 0) + (data?.overview?.urgency_breakdown?.high || 0);
  
  // Format WoW trend safely
  const wowChange = data?.overview?.week_over_week_change_percent ?? 0;
  const isWowPositive = wowChange >= 0;

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-12">
        
        {/* Header Block & Time-Range Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-left border-b border-border/80 pb-6 pt-1">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-sans font-bold text-2xl lg:text-3xl tracking-tight text-text-primary">
                Clinical Command Center
              </h1>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/25">
                  <ShieldCheck className="h-3 w-3" />
                  HIPAA Secure
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                  <Cpu className="h-3 w-3" />
                  6 AI Agents
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Real-time multi-agent triage benchmarks, safety anomaly surveillance, and clinical decision metrics
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
            {/* Days selection pill row */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-muted border border-border">
              {[
                { label: '7 Days', value: 7 },
                { label: '30 Days', value: 30 },
                { label: '90 Days', value: 90 }
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setDays(pill.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans tracking-tight transition-all cursor-pointer ${
                    days === pill.value 
                      ? 'bg-surface text-primary shadow-sm border border-border/80' 
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Sync Refresh Button */}
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50 cursor-pointer shadow-sm"
              title="Refresh all metrics"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>

            {/* Quick Action Button: New Patient Intake */}
            <Link
              href="/patient/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md shadow-primary/20 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Intake</span>
            </Link>
          </div>
        </div>

        {/* Anomaly Alerts Banner Section */}
        {data.anomalies && data.anomalies.length > 0 && (
          <AnomalyAlertBanner anomalies={data.anomalies} />
        )}

        {/* 4 Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
          <StatsCard
            title="Total Intake"
            value={data.overview.total_sessions}
            label={`${data.overview.sessions_today} admitted today`}
            icon={Users}
            colorClass="text-primary bg-primary/10 border-primary/20"
            trend={{ 
              value: `${isWowPositive ? '+' : ''}${wowChange}% WoW`, 
              isPositive: isWowPositive 
            }}
          />
          <StatsCard
            title="Completed Analysis"
            value={data.overview.completed_sessions}
            label="Decision support compiled"
            icon={CheckSquare}
            colorClass="text-success bg-success/10 border-success/20"
            trend={{ 
              value: `${data.overview.completion_rate_percent}% rate`, 
              isPositive: data.overview.completion_rate_percent >= 90 
            }}
          />
          <StatsCard
            title="Urgent Triages"
            value={criticalCount}
            label={`${data.overview.urgency_breakdown.critical || 0} critical cases flagged`}
            icon={AlertTriangle}
            colorClass="text-danger bg-danger/10 border-danger/20"
            trend={{ 
              value: criticalCount > 0 ? `${criticalCount} urgent` : 'Nominal', 
              isPositive: criticalCount === 0 
            }}
          />
          <StatsCard
            title="Avg Processing Speed"
            value={`${data.overview.avg_pipeline_seconds}s`}
            label={`fastest: ${data.overview.fastest_pipeline_seconds}s`}
            icon={Clock}
            colorClass="text-accent bg-accent/10 border-accent/20"
            trend={{ 
              value: 'Pipeline OK', 
              isPositive: data.overview.avg_pipeline_seconds < 25 
            }}
          />
        </div>

        {/* Primary Row: Daily Triage Activity (Area) + Patient Demographics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
          <div className="lg:col-span-8 flex">
            <DailyTrendChart data={data.daily_trend} />
          </div>
          <div className="lg:col-span-4 flex">
            <DemographicsChart data={data.patient_demographics} />
          </div>
        </div>

        {/* Secondary Row: Clinical Diagnostic Patterns & Drug Interaction Screenings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
          <div className="lg:col-span-6 flex">
            <DiagnosisPatternChart data={data.top_diagnoses} />
          </div>
          <div className="lg:col-span-6 flex">
            <DrugInteractionChart data={data.drug_interactions} />
          </div>
        </div>

        {/* Tertiary Row: Agent Pipeline Benchmarks (Full 12 cols for clean health list) */}
        <div className="w-full">
          <AgentPerformanceChart data={data.agent_performance} />
        </div>

        {/* Quaternary Row: Live Recent Clinical Sessions Table */}
        <div className="w-full">
          {recentLoading ? (
            <div className="w-full flex items-center justify-center p-12 border border-border rounded-2xl bg-surface shadow-lg">
              <LoadingSpinner size="md" label="Loading live triages..." />
            </div>
          ) : (
            <RecentSessions sessions={recentSessionsList} />
          )}
        </div>

      </div>
    </ErrorBoundary>
  );
}
