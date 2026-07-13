'use client';

import React, { useEffect, useState } from 'react';
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
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/70 backdrop-blur-md select-none">
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
                    onClick={() => setShowProfileModal(true)}
                    className="w-full px-4 py-2 hover:bg-background/40 text-text-secondary hover:text-text-primary flex items-center gap-2.5 text-left focus:outline-none"
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
                    className="w-full px-4 py-2 hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center gap-2.5 text-left focus:outline-none font-semibold"
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

      {/* Staff Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#111827] border border-border shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h3 className="font-bold text-base text-left">Clinical Staff Profile</h3>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-raised transition-colors focus:outline-none"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 text-left text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-muted font-mono uppercase">Full Name</span>
                <span className="font-bold text-text-primary text-base">{clinician?.name}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-muted font-mono uppercase">Clinical Email</span>
                <span className="font-mono text-text-secondary">{clinician?.email}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-muted font-mono uppercase">Role Privilege</span>
                  <span className="font-semibold text-[#0d9488] capitalize">{clinician?.role}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-muted font-mono uppercase">Specialty</span>
                  <span className="font-semibold text-text-secondary">{clinician?.specialty || 'General CDSS'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-muted font-mono uppercase">Assigned Institution</span>
                <span className="font-semibold text-text-primary">{clinician?.institution_name} ({clinician?.institution_code})</span>
              </div>

              <div className="w-full h-px bg-border/40 my-1" />

              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-text-muted">
                <div className="flex flex-col">
                  <span>Login Sessions:</span>
                  <span className="font-bold text-text-secondary mt-0.5">{clinician?.login_count || 0} logins</span>
                </div>
                <div className="flex flex-col">
                  <span>Last Login:</span>
                  <span className="font-bold text-text-secondary mt-0.5">
                    {clinician?.last_login_at ? new Date(clinician.last_login_at).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
