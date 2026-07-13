'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, Lock, Building2, Eye, EyeOff, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ─────────────────────────────────────────────────────────────────────────────
// Inner form component — isolated so useSearchParams() is inside <Suspense>
// ─────────────────────────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const login = useAuthStore((state) => state.login);
  const authError = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const isStoreLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const staff = useAuthStore((state) => state.staff);

  const [email, setEmail] = useState('');
  const [keyPhrase, setKeyPhrase] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    const initAuth = async () => {
      const active = await loadFromStorage();
      if (active) {
        router.push('/dashboard');
      }
    };
    initAuth();
  }, [loadFromStorage, router]);

  useEffect(() => {
    if (isAuthenticated && staff) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, staff, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    setSuccessMessage(null);

    if (!email.includes('@')) {
      setLocalError('Please enter a valid clinical email address.');
      return;
    }
    if (keyPhrase.length < 8) {
      setLocalError('Clinical key phrase must be at least 8 characters.');
      return;
    }
    if (institutionCode.trim().length < 3) {
      setLocalError('Institution code must be at least 3 characters.');
      return;
    }

    const success = await login(
      email,
      keyPhrase,
      institutionCode.toUpperCase().trim()
    );

    if (success) {
      const currentStaff = useAuthStore.getState().staff;
      const staffName = currentStaff ? currentStaff.full_name : 'Clinician';
      setSuccessMessage(`Access granted. Welcome, ${staffName}`);
      toast.success(`Access granted. Welcome, ${staffName}`);

      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1000);
    }
  };

  const activeError = localError || authError;
  const isLoading = isStoreLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-[420px] rounded-2xl bg-[#111827] border-t-[3px] border-[#0d9488] border-x border-b border-border/80 shadow-2xl p-8 flex flex-col gap-6 text-left relative z-10"
    >
      {/* Shield and Branding Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="h-14 w-14 rounded-full bg-[#0d9488]/10 border border-[#0d9488]/30 text-[#0d9488] flex items-center justify-center shadow-[0_0_15px_rgba(13,148,136,0.2)]">
          <ShieldCheck className="h-7 w-7 animate-pulse" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-sans font-bold text-2xl tracking-tight text-text-primary">
            MediGuard <span className="text-[#0d9488] text-lg">V2</span>
          </h1>
          <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Clinical Decision Support System
          </p>
        </div>
        <div className="w-full h-px bg-border/50 my-1" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-secondary">
            Clinical Portal Access
          </span>
          <span className="text-[10px] text-text-muted mt-1 leading-normal">
            Authorized clinical staff only. Logs audited for HIPAA compliance.
          </span>
        </div>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">

        {/* Field 1: Email Address */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-text-secondary">
            Clinical Email Address
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              <Mail className="h-4.5 w-4.5" />
            </span>
            <input
              id="email"
              type="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@hospital.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Field 2: Key Phrase */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="keyPhrase" className="text-xs font-semibold text-text-secondary">
            Clinical Key Phrase
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              <Lock className="h-4.5 w-4.5" />
            </span>
            <input
              id="keyPhrase"
              type={showPassword ? 'text' : 'password'}
              required
              disabled={isLoading}
              value={keyPhrase}
              onChange={(e) => setKeyPhrase(e.target.value)}
              placeholder="Enter your clinical key phrase"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Field 3: Institution Code */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="institutionCode" className="text-xs font-semibold text-text-secondary">
            Institution Code
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <input
              id="institutionCode"
              type="text"
              required
              disabled={isLoading}
              value={institutionCode}
              onChange={(e) => setInstitutionCode(e.target.value.toUpperCase())}
              placeholder="e.g. APOLLO-CHN-001"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none transition-colors font-mono uppercase tracking-wider disabled:opacity-50"
            />
          </div>
          <span className="text-[10px] text-text-muted leading-tight">
            Provided by your institution administrator
          </span>
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isLoading || !!successMessage}
          className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-3 rounded-xl bg-[#0d9488] text-white hover:bg-[#0d9488]/90 transition-all font-semibold text-sm shadow-[0_0_12px_rgba(13,148,136,0.25)] disabled:opacity-50 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Access Clinical Portal</span>
          )}
        </button>
      </form>

      {/* Dynamic Alerts Block */}
      <AnimatePresence mode="wait">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-xl bg-success/15 border border-success/30 flex items-start gap-2.5 text-xs text-success leading-relaxed font-sans"
          >
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {activeError && !successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-xl bg-danger/15 border border-danger/30 flex items-start gap-2.5 text-xs text-danger leading-relaxed font-sans"
          >
            <ShieldAlert className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <span>{activeError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit notice footer */}
      <div className="flex flex-col gap-1 items-center mt-2">
        <span className="text-[10px] text-text-muted leading-tight">
          Need access? Contact your institution administrator to create your account.
        </span>
        <span className="text-[9px] text-[#0d9488]/90 font-mono mt-1">
          🔒 All sessions are encrypted and audited
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export — wraps LoginForm in Suspense to satisfy Next.js static rendering
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f1e] px-6 relative overflow-hidden select-none">

      {/* Background medical grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(13,148,136,0.07),transparent_50%)] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-[420px] rounded-2xl bg-[#111827] border-t-[3px] border-[#0d9488] border-x border-b border-border/80 shadow-2xl p-8 flex items-center justify-center min-h-[400px]">
            <span className="h-8 w-8 border-2 border-[#0d9488]/20 border-t-[#0d9488] rounded-full animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
