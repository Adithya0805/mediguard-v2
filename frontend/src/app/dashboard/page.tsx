'use client';

import React, { useState, useEffect } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentSessions from '@/components/dashboard/RecentSessions';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Import newly created analytics hooks & charts
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
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [recentSessionsList, setRecentSessionsList] = useState<PatientSession[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Retrieve data using custom analytics hook
  const { data, isLoading, isRefreshing, error, refetch } = useAnalytics(days);

  // Fetch recent patient sessions separately
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

  if (isLoading || !data) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" label="Initializing secure clinician analytics engine..." />
        <span className="text-xs text-text-muted font-mono">Loading data from PostgreSQL aggregation views...</span>
      </div>
    );
  }

  // Calculate critical case metric from overview breakdown
  const criticalCount = (data.overview.urgency_breakdown.critical || 0) + (data.overview.urgency_breakdown.high || 0);
  
  // Format WoW trend
  const wowChange = data.overview.week_over_week_change_percent;
  const isWowPositive = wowChange >= 0;

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-8 w-full p-1 sm:p-2">
        
        {/* Header Block & Time-Range Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left border-b border-border pb-5">
          <div className="flex flex-col">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-text-primary">
              Clinical Command Center
            </h2>
            <span className="text-sm text-text-secondary mt-1">
              Real-time multi-agent benchmarking, safety anomalies, and triage metrics
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Refresh Button */}
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-muted transition-colors text-text-secondary disabled:opacity-50 cursor-pointer"
              title="Refresh all metrics"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Days selection pill row */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-muted border border-border">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans tracking-tight transition-all cursor-pointer ${
                    days === d 
                      ? 'bg-surface text-primary shadow-sm border border-border/80' 
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Last {d} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Anomaly Alerts Banner Section */}
        <AnomalyAlertBanner anomalies={data.anomalies} />

        {/* 4 Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
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
              value: 'Urgency active', 
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

        {/* Primary Row: Daily Triage (Area) + Patient Demographics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          <div className="lg:col-span-8 flex">
            <DailyTrendChart data={data.daily_trend} />
          </div>
          <div className="lg:col-span-4 flex">
            <DemographicsChart data={data.patient_demographics} />
          </div>
        </div>

        {/* Secondary Row: Agent Benchmarking + Drug Interactions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          <div className="lg:col-span-7 flex">
            <AgentPerformanceChart data={data.agent_performance} />
          </div>
          <div className="lg:col-span-5 flex">
            <DrugInteractionChart data={data.drug_interactions} />
          </div>
        </div>

        {/* Tertiary Row: Diagnostic Patterns + Live Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          <div className="lg:col-span-7 flex">
            <DiagnosisPatternChart data={data.top_diagnoses} />
          </div>
          <div className="lg:col-span-5 flex">
            <div className="w-full h-full">
              {recentLoading ? (
                <div className="h-full w-full flex items-center justify-center p-8 border border-border rounded-2xl bg-surface shadow-lg">
                  <LoadingSpinner size="md" label="Loading live triages..." />
                </div>
              ) : (
                <RecentSessions sessions={recentSessionsList} />
              )}
            </div>
          </div>
        </div>

      </div>
    </ErrorBoundary>
  );
}
