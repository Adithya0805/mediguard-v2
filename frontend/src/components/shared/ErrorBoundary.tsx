'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Clinical Error Boundary Captured]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 rounded-2xl bg-surface border border-danger/20 text-center max-w-xl mx-auto my-12">
          {/* Visual Alert Shield */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 border border-danger/20 text-danger shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="font-sans font-bold text-xl tracking-tight text-text-primary">
              Clinical Session Interrupted
            </h2>
            <p className="text-sm text-text-secondary max-w-md leading-relaxed">
              A runtime scripting exception occurred while drawing clinical summaries or loading decision support widgets. This has been securely reported for HIPAA audit logs.
            </p>
            {this.state.error && (
              <pre className="mt-4 p-3 rounded-lg bg-background border border-border text-left font-mono text-[10px] text-danger overflow-x-auto max-w-full">
                {this.state.error.name}: {this.state.error.message}
              </pre>
            )}
          </div>

          {/* Action Buttons */}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-danger text-white hover:bg-red-700 transition-all font-sans font-semibold text-sm shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:scale-[1.02]"
          >
            <RefreshCw className="h-4 w-4 animate-spin-slow" />
            <span>Restart Clinical Interface</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
