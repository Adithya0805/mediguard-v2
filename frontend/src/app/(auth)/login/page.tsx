'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Activity, Lock, Mail, Building, Key } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoadingStore = useAuthStore((state) => state.isLoading);
  
  const [email, setEmail] = useState('robertson@mediguard.ai');
  const [password, setPassword] = useState('ClinicalTriage2026!');
  const [hospitalCode, setHospitalCode] = useState('HOSP-NY-9912');
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLocalLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Clinical Authentication Succeeded! Welcome back, Dr. Robertson.');
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Clinical authentication failed.');
    } finally {
      setIsLocalLoading(false);
    }
  };

  const isLoading = isLocalLoading || isLoadingStore;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f1e] px-6">
      
      {/* Background visual graphics */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(13,148,136,0.06),transparent_50%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 rounded-2xl bg-surface border border-border/80 shadow-2xl flex flex-col gap-6 text-left"
      >
        {/* Brand header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-sans font-bold text-xl tracking-tight text-text-primary">
              Clinical Portal Access
            </h2>
            <span className="text-xs text-text-secondary mt-1">
              Authorized clinical staff only. Logs audited for HIPAA compliance.
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Clinical Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.org"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Clinical Key Phrase</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Hospital Code */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Institution Code</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Building className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                required
                value={hospitalCode}
                onChange={(e) => setHospitalCode(e.target.value)}
                placeholder="HOSP-XX-XXXX"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-3 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all font-semibold text-sm shadow-[0_0_12px_rgba(13,148,136,0.3)] disabled:opacity-50 hover:scale-[1.01]"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-text-primary/20 border-t-text-primary rounded-full animate-spin" />
            ) : (
              <Key className="h-4.5 w-4.5" />
            )}
            <span>Authenticate Secure Session</span>
          </button>

        </form>

        {/* Audit Disclaimer Footer */}
        <div className="p-3.5 rounded-lg bg-background/50 border border-border/80 text-[10px] text-text-muted leading-relaxed font-mono text-center">
          HIPAA Audit Notice: Unauthorized access attempts are monitored and recorded. This session is bound by active clinical privilege configurations.
        </div>

      </motion.div>

    </div>
  );
}
