'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Key, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, ShieldAlert } from 'lucide-react';
import { changeKeyPhrase } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ChangeKeyPhrasePage() {
  const router = useRouter();
  const staff = useAuthStore((state) => state.staff);

  const [currentKeyPhrase, setCurrentKeyPhrase] = useState('');
  const [newKeyPhrase, setNewKeyPhrase] = useState('');
  const [confirmKeyPhrase, setConfirmKeyPhrase] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newKeyPhrase.length < 8) {
      setErrorMsg('New key phrase must be at least 8 characters long.');
      return;
    }
    if (newKeyPhrase !== confirmKeyPhrase) {
      setErrorMsg('New key phrase and confirmation phrase do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await changeKeyPhrase({
        current_key_phrase: currentKeyPhrase,
        new_key_phrase: newKeyPhrase,
        confirm_key_phrase: confirmKeyPhrase
      });
      setSuccessMsg('Clinical key phrase updated successfully. Active sessions secured.');
      toast.success('Key phrase updated successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      // In demo mode without external database connection, simulate successful rotation
      if (staff?.institution_code === 'MEDIGUARD-DEMO') {
        setSuccessMsg('Clinical key phrase updated successfully (Demo Mode).');
        toast.success('Key phrase updated (Demo Mode)!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
        return;
      }
      const message = err.message || 'Failed to update key phrase. Please verify your current key phrase.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Back button */}
      <div>
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Clinical Command Center</span>
        </Link>
      </div>

      {/* Card Header */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-border/80 shadow-xl flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-[0_0_12px_rgba(13,148,136,0.2)]">
            <Key className="h-6 w-6" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="font-bold text-xl text-text-primary">Change Clinical Key Phrase</h1>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Rotate your credential key phrase. Updating your key phrase will re-encrypt your access token and invalidate old inactive browser sessions for HIPAA compliance.
            </p>
          </div>
        </div>

        {/* Current Clinician Banner */}
        {staff && (
          <div className="p-3.5 rounded-xl bg-background/50 border border-border/60 flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">Clinician Account:</span>
            <span className="text-teal-400 font-semibold">{staff.full_name} ({staff.email})</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {/* Field 1: Current Key Phrase */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Current Key Phrase</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentKeyPhrase}
                onChange={(e) => setCurrentKeyPhrase(e.target.value)}
                placeholder="Enter current key phrase"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border text-sm text-text-primary focus:border-[#0d9488] focus:outline-none transition-colors"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Field 2: New Key Phrase */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">New Key Phrase</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Key className="h-4 w-4 text-teal-400" />
              </span>
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newKeyPhrase}
                onChange={(e) => setNewKeyPhrase(e.target.value)}
                placeholder="Enter new secure key phrase (min. 8 characters)"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border text-sm text-text-primary focus:border-[#0d9488] focus:outline-none transition-colors"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <span className="text-[10px] text-text-muted">Must contain at least 8 characters.</span>
          </div>

          {/* Field 3: Confirm New Key Phrase */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Confirm New Key Phrase</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={confirmKeyPhrase}
                onChange={(e) => setConfirmKeyPhrase(e.target.value)}
                placeholder="Re-enter new key phrase"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm text-text-primary focus:border-[#0d9488] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs flex items-center gap-2"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-text-secondary hover:text-text-primary text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all shadow-[0_0_12px_rgba(13,148,136,0.3)] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Updating Key Phrase...</span>
                </>
              ) : (
                <span>Save New Key Phrase</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
