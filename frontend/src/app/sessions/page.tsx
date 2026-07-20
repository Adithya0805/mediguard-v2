'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessions } from '@/hooks/useSessions';
import StatusBadge from '@/components/shared/StatusBadge';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { SessionTableSkeleton } from '@/components/shared/Skeletons';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { UrgencyLevel } from '@/types';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ClipboardList, 
  Eye, 
  FileText 
} from 'lucide-react';

export default function SessionsPage() {
  const router = useRouter();
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const limit = 20;

  const { sessions, total, isLoading, error } = useSessions({
    page,
    limit,
    statusFilter,
    urgencyFilter,
    searchQuery,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const handleRowClick = (sessionId: string) => {
    router.push(`/patient/${sessionId}`);
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-8 w-full text-left font-sans">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-text-primary">
              Clinical Session Catalog
            </h2>
            <span className="text-sm text-text-secondary">
              Search and filter patient intakes, active graphs, and completed reports.
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            FILTER BAR
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 rounded-2xl bg-surface border border-border">
          
          {/* Search Input (5 Cols) */}
          <div className="md:col-span-5 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // reset to first page
              }}
              placeholder="Search by patient name or chief complaint..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Status Filter (3 Cols) */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-background border border-[#1e293b] text-text-primary text-xs focus:border-primary focus:outline-none transition-colors"
            >
              <option value="all">All Pipeline Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Complete</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Urgency Filter (3 Cols) */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted flex-shrink-0" />
            <select
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-background border border-[#1e293b] text-text-primary text-xs focus:border-primary focus:outline-none transition-colors"
            >
              <option value="all">All Urgency Levels</option>
              <option value="low">Low Urgency</option>
              <option value="medium">Medium Urgency</option>
              <option value="high">High Urgency</option>
              <option value="critical">Critical Urgency</option>
            </select>
          </div>

          {/* Total catalog counter (1 Col) */}
          <div className="md:col-span-1 flex items-center justify-center font-mono font-bold text-xs text-primary px-2 rounded-xl bg-primary/10 border border-primary/20">
            {total} Cases
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            CATALOG TABLE
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="w-full rounded-2xl bg-surface border border-border shadow-lg overflow-hidden">
          {isLoading ? (
            <SessionTableSkeleton />
          ) : error ? (
            <div className="py-12 p-4 text-center text-danger font-semibold text-sm">
              Error loading sessions: {error}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center text-text-muted gap-3">
              <ClipboardList className="h-14 w-14 text-border" />
              <span className="text-base font-bold text-text-secondary">No Sessions Located</span>
              <p className="text-xs max-w-sm leading-relaxed">
                Adjust search variables or complete patient intakes to populate diagnostic history logs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left font-sans">
                <thead>
                  <tr className="border-b border-border text-text-secondary text-[11px] font-semibold uppercase tracking-wider bg-background/40">
                    <th className="py-3.5 px-6">Patient Name</th>
                    <th className="py-3.5 px-6 w-28">Sex / Age</th>
                    <th className="py-3.5 px-6">Chief Complaint</th>
                    <th className="py-3.5 px-6 w-32">Urgency</th>
                    <th className="py-3.5 px-6 w-36">Status</th>
                    <th className="py-3.5 px-6 w-28">Date</th>
                    <th className="py-3.5 px-6 w-36 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const isCompleted = session.status === 'completed';
                    
                    // Simple mock triage mappings
                    let mockUrgency = 'medium';
                    if (session.patient_name.includes('Kumar') || session.status === 'failed') {
                      mockUrgency = 'high';
                    } else if (session.status === 'pending') {
                      mockUrgency = 'low';
                    }

                    const dateStr = new Date(session.created_at).toLocaleDateString([], { month: 'short', day: '2-digit' });

                    return (
                      <tr
                        key={session.id}
                        onClick={() => handleRowClick(session.id)}
                        className="border-b border-border/40 hover:bg-surface-raised/40 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-6 font-bold text-text-primary">{session.patient_name}</td>
                        <td className="py-4 px-6 text-xs font-mono text-text-secondary uppercase">
                          {session.patient_gender.charAt(0)} / {session.patient_age}y
                        </td>
                        <td className="py-4 px-6 text-xs text-text-secondary max-w-[200px] truncate" title={session.chief_complaint}>
                          {session.chief_complaint}
                        </td>
                        <td className="py-4 px-6">
                          <UrgencyBadge urgency={mockUrgency as UrgencyLevel} size="sm" />
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={session.status} size="sm" />
                        </td>
                        <td className="py-4 px-6 text-xs font-mono text-text-secondary">{dateStr}</td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => router.push(`/patient/${session.id}`)}
                              className="p-2 text-text-secondary hover:text-text-primary rounded-lg border border-border hover:bg-surface-raised transition-colors"
                              title="View Session"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {isCompleted && (
                              <button
                                onClick={() => router.push(`/report/${session.id}`)}
                                className="p-2 text-primary hover:text-primary-hover rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                                title="View CDS Report"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            PAGINATION CONTROLS
            ───────────────────────────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/40 pt-4 px-2">
            <span className="text-xs text-text-secondary">
              Showing page <b>{page}</b> of <b>{totalPages}</b> (Total: {total} records)
            </span>

            <div className="flex items-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 transition-opacity"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 transition-opacity"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}
