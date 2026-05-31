'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Bell, LogOut } from 'lucide-react';
import { checkHealth } from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  
  const clinician = useAuthStore((state) => state.clinician);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const logout = useAuthStore((state) => state.logout);
  
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const verifySystemHealth = async () => {
      try {
        const response = await checkHealth();
        if (response && response.status === 'healthy') {
          setHealthStatus('healthy');
        } else {
          setHealthStatus('unhealthy');
        }
      } catch {
        setHealthStatus('unhealthy');
      }
    };
    verifySystemHealth();
    // Poll health status every 30 seconds
    const interval = setInterval(verifySystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', id: 'dashboard' },
    { label: 'New Patient', path: '/patient/new', id: 'new-patient' },
    { label: 'Sessions', path: '/sessions', id: 'sessions' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        
        {/* Logo Section */}
        <Link 
          href="/" 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 group"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary transition-all duration-300 group-hover:bg-primary/20">
            <Activity className="h-5 w-5 animate-pulse" />
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-sm scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-text-primary">
            MEDIGUARD <span className="text-accent text-sm font-semibold align-super">V2</span>
          </span>
        </Link>

        {/* Center Navigation Links */}
        <div className="hidden md:flex items-center gap-8 h-full">
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center h-full text-sm font-medium tracking-wide transition-colors hover:text-text-primary ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                {item.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Action Widgets */}
        <div className="flex items-center gap-6">
          
          {/* Health Check Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-border text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${
              healthStatus === 'healthy' 
                ? 'bg-success shadow-[0_0_8px_#10b981]' 
                : healthStatus === 'checking' 
                ? 'bg-warning animate-pulse' 
                : 'bg-danger shadow-[0_0_8px_#ef4444]'
            }`} />
            <span className="font-mono text-[10px] text-text-secondary uppercase">
              {healthStatus === 'healthy' ? 'API Active' : healthStatus === 'checking' ? 'Checking' : 'API Down'}
            </span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-text-secondary hover:text-text-primary rounded-lg bg-surface/50 border border-border/50 hover:bg-surface-raised transition-all">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_#06b6d4]" />
          </button>

          {/* User Profile */}
          {(() => {
            const displayName = clinician?.name || 'Dr. Robertson';
            const displayRole = clinician?.role || 'Physician';
            const getInitials = (name: string) => {
              const parts = name.split(' ');
              if (parts.length >= 2) {
                if (parts[0].toLowerCase().startsWith('dr')) {
                  return 'DR';
                }
                return (parts[0][0] + parts[1][0]).toUpperCase();
              }
              return name.slice(0, 2).toUpperCase();
            };
            const initials = getInitials(displayName);
            return (
              <div className="flex items-center gap-3 pl-2 border-l border-border/80">
                <div className="relative h-8 w-8 rounded-full border border-primary bg-primary/10 flex items-center justify-center font-sans font-bold text-xs text-primary shadow-[0_0_4px_var(--primary)]">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-text-primary leading-none">{displayName}</span>
                  <span className="text-[10px] text-text-secondary font-mono uppercase mt-0.5">{displayRole}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  title="Close secure session"
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            );
          })()}

        </div>

      </div>
    </nav>
  );
}
