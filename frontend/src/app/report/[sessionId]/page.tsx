'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useReport } from '@/hooks/useReport';
import ReportViewer from '@/components/report/ReportViewer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { session, isLoading: sessionLoading, error: sessionError } = useSession(sessionId);
  const { report, isLoading: reportLoading, error: reportError } = useReport(sessionId, session?.status);

  const isLoading = sessionLoading || reportLoading;
  const error = sessionError || reportError;

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Retrieving diagnostic decision support documents..." />
      </div>
    );
  }

  if (error || !session || !report) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-2xl bg-surface border border-danger/20 text-center my-12">
        <div className="text-danger font-bold text-lg">Failed to Retrieve Report Documents</div>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {error || 'Clinical report document has not been enqueued or analysis is still pending.'}
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => router.push(`/patient/${sessionId}`)}
            className="px-5 py-2.5 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all text-sm font-semibold"
          >
            Check Case Tracker status
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition-all text-sm font-semibold"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full">
        <ReportViewer report={report} session={session} />
      </div>
    </ErrorBoundary>
  );
}
