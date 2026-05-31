'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  UserPlus, 
  ClipboardList, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { checkHealth } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected'>('connected');

  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const h = await checkHealth();
        if (h && h.status === 'healthy') {
          setDbStatus('connected');
        } else {
          setDbStatus('disconnected');
        }
      } catch {
        setDbStatus('disconnected');
      }
    };
    fetchDbStatus();
  }, []);

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { label: 'New Patient', path: '/patient/new', icon: UserPlus, id: 'new-patient' },
    { label: 'All Sessions', path: '/sessions', icon: ClipboardList, id: 'sessions' },
    { label: 'Clinical Reports', path: '/sessions', icon: FileText, id: 'reports' }, // fallbacks to sessions for selector
    { label: 'Settings', path: '/dashboard', icon: Settings, id: 'settings' }
  ];

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 256 : 72 }}
      transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
      className="fixed left-0 top-16 bottom-0 z-40 border-r border-border bg-surface flex flex-col justify-between"
    >
      
      {/* Top Navigation Lists */}
      <div className="flex flex-col gap-2 py-6 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || 
            (item.id === 'new-patient' && pathname === '/patient/new') ||
            (item.id === 'sessions' && pathname === '/sessions') ||
            (item.id === 'reports' && pathname?.includes('/report/')) ||
            (item.id === 'dashboard' && pathname === '/dashboard');
          
          return (
            <Link
              key={item.id}
              href={item.path}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all relative ${
                isActive 
                  ? 'bg-primary text-text-primary shadow-[0_0_12px_rgba(13,148,136,0.3)]' 
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium tracking-wide whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>

      {/* Bottom Health Widget & Collapser */}
      <div className="flex flex-col gap-4 p-4 border-t border-border/80">
        
        {/* System Health Widget */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="p-3.5 rounded-xl bg-background/50 border border-border flex flex-col gap-2 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">Clinical Node</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-mono font-bold uppercase">v2.0.0</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Server className={`h-3.5 w-3.5 ${dbStatus === 'connected' ? 'text-success animate-pulse' : 'text-danger'}`} />
                <span className="text-[11px] font-mono text-text-primary">Clinical DB:</span>
                <span className={`text-[10px] font-bold ${dbStatus === 'connected' ? 'text-success' : 'text-danger'}`}>
                  {dbStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-mono text-text-primary">HIPAA Status:</span>
                <span className="text-[10px] font-bold text-accent">SECURE</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse Button */}
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-full items-center justify-center rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-text-primary transition-all duration-300"
        >
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-4.5 w-4.5" />
              <span className="text-xs font-semibold whitespace-nowrap">Collapse Menu</span>
            </div>
          ) : (
            <ChevronRight className="h-4.5 w-4.5" />
          )}
        </button>

      </div>

    </motion.aside>
  );
}
