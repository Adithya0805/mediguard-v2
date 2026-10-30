'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Bell, LogOut, ChevronDown, User, Shield, Key, X } from 'lucide-react';
import { checkHealth } from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  
  const staff = useAuthStore((state) => state.staff);
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const logout = useAuthStore((state) => state.logout);
  
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close profile modal on Escape key press
  useEffect(() => {
    if (!showProfileModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showProfileModal]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

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

  // Close dropdown on click outside
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showMenu]);

  const clinician = staff ? {
    name: staff.full_name,
    role: staff.role,
    specialty: staff.specialization,
    institution_name: staff.institution_name,
    institution_code: staff.institution_code,
    email: staff.email,
    last_login_at: staff.last_login_at,
    login_count: staff.login_count,
    id: staff.id
  } : null;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', id: 'dashboard' },
    { label: 'New Patient', path: '/patient/new', id: 'new-patient' },
    { label: 'Sessions', path: '/sessions', id: 'sessions' },
    { label: 'Architecture', path: '/architecture-simulator', id: 'architecture' },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'physician':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/15 text-[#0d9488] border border-teal-500/20">MD</span>;
      case 'nurse':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">RN</span>;
      case 'pharmacist':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">RPh</span>;
      case 'admin':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20">ADMIN</span>;
      case 'superadmin':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">SADMIN</span>;
      default:
        return null;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/80 bg-[#0a0f1e]/95 backdrop-blur-lg shadow-sm select-none">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        
        {/* Logo and Institution Subtitle Section */}
        <Link 
          href="/" 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 group"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary transition-all duration-300 group-hover:bg-primary/20">
            <Activity className="h-5 w-5 animate-pulse" />
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-sm scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-sans font-bold text-base leading-none tracking-tight text-text-primary">
              MEDIGUARD <span className="text-[#0d9488] text-xs font-semibold align-super">V2</span>
            </span>
            {clinician?.institution_name && (
              <span className="text-[9px] text-text-muted mt-0.5 truncate max-w-[180px] font-medium leading-none">
                {clinician.institution_name}
              </span>
            )}
          </div>
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
          <button className="relative p-2 text-text-secondary hover:text-text-primary rounded-lg bg-surface/50 border border-border/50 hover:bg-surface-raised transition-all focus:outline-none">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_#06b6d4]" />
          </button>

          {/* User Profile Dropdown */}
          {clinician && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="flex items-center gap-2.5 pl-2 border-l border-border/85 focus:outline-none"
              >
                <div className="relative h-8 w-8 rounded-full border border-[#0d9488] bg-[#0d9488]/10 flex items-center justify-center font-sans font-bold text-xs text-[#0d9488] shadow-[0_0_4px_rgba(13,148,136,0.15)]">
                  {clinician.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-text-primary leading-none flex items-center gap-1.5">
                    {clinician.name}
                    {getRoleBadge(clinician.role)}
                  </span>
                  <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider mt-1">{clinician.role}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2.5 w-56 rounded-xl bg-[#111827] border border-border/90 shadow-2xl overflow-hidden text-left py-1 text-sm z-50">
                  <div className="px-4 py-2 border-b border-border/40 flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-text-primary">{clinician.name}</span>
                    <span className="text-[10px] text-text-muted font-mono truncate">{clinician.email}</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 hover:bg-background/40 text-text-secondary hover:text-text-primary flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
                  >
                    <User className="h-4 w-4 text-[#0d9488]" />
                    <span>My Profile</span>
                  </button>

                  <Link
                    href="/account/change-key-phrase"
                    className="w-full px-4 py-2 hover:bg-background/40 text-text-secondary hover:text-text-primary flex items-center gap-2.5 text-left block"
                  >
                    <Key className="h-4 w-4 text-[#0d9488]" />
                    <span>Change Key Phrase</span>
                  </Link>

                  {(clinician.role === 'admin' || clinician.role === 'superadmin') && (
                    <Link
                      href="/admin"
                      className="w-full px-4 py-2 hover:bg-background/40 text-text-secondary hover:text-text-primary flex items-center gap-2.5 text-left block"
                    >
                      <Shield className="h-4 w-4 text-[#0d9488]" />
                      <span>Admin Control Panel</span>
                    </Link>
                  )}

                  <div className="h-px bg-border/40 my-1" />

                  <button
                    onClick={async () => {
                      await logout();
                      router.push('/login');
                    }}
                    className="w-full px-4 py-2 hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center gap-2.5 text-left focus:outline-none font-semibold cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Staff Profile Modal rendered into document.body to avoid navbar overflow clipping */}
      {showProfileModal && mounted && createPortal(
        <div 
          onClick={() => setShowProfileModal(false)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#111827] border border-border/90 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-surface/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-xs">
                  {clinician?.name ? clinician.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'MD'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary text-left leading-none">Clinical Staff Profile</h3>
                  <span className="text-[10px] text-teal-400 font-mono">Verified Credential</span>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors focus:outline-none cursor-pointer"
                aria-label="Close Profile Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 flex flex-col gap-4 text-left text-sm">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-background/60 border border-border/50">
                <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Clinician Name</span>
                <span className="font-bold text-text-primary text-base flex items-center gap-2">
                  {clinician?.name}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-[#0d9488] border border-teal-500/20">
                    MD / CMO
                  </span>
                </span>
                <span className="font-mono text-xs text-text-secondary mt-0.5">{clinician?.email}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-background/40 border border-border/40 flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted font-mono uppercase">Role Privilege</span>
                  <span className="font-semibold text-teal-400 capitalize text-sm">{clinician?.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-background/40 border border-border/40 flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted font-mono uppercase">Specialty</span>
                  <span className="font-semibold text-text-secondary text-sm">{clinician?.specialty || 'Emergency Cardiology'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/40 border border-border/40 flex flex-col gap-1">
                <span className="text-[10px] text-text-muted font-mono uppercase">Assigned Institution</span>
                <span className="font-semibold text-text-primary text-sm leading-tight">
                  {clinician?.institution_name}
                </span>
                <span className="text-[11px] font-mono text-teal-400/90">{clinician?.institution_code}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono text-text-muted p-3 rounded-xl bg-background/40 border border-border/40">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase">Login Sessions:</span>
                  <span className="font-bold text-text-primary mt-0.5">{clinician?.login_count || 0} logins</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase">Last Access:</span>
                  <span className="font-bold text-text-primary mt-0.5">
                    {clinician?.last_login_at ? new Date(clinician.last_login_at).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1">
                <span className="flex items-center gap-1.5 text-teal-400/90">
                  <Shield className="h-3.5 w-3.5" />
                  HIPAA Audited Session
                </span>
                <span className="text-text-muted">ID: {clinician?.id?.slice(0, 8)}...</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-3.5 border-t border-border/50 bg-surface/30 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-raised text-text-primary text-xs font-semibold transition-all cursor-pointer"
              >
                Close Profile
              </button>
              <button
                onClick={async () => {
                  setShowProfileModal(false);
                  await logout();
                  router.push('/login');
                }}
                className="px-4 py-2 rounded-xl bg-danger/15 border border-danger/30 text-danger hover:bg-danger/25 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
