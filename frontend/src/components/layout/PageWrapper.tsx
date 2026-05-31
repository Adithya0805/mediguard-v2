'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const isAuthOrLanding = pathname === '/login' || pathname === '/';

  React.useEffect(() => {
    if (!isAuthOrLanding) {
      const hasToken = localStorage.getItem('medi_token');
      if (!hasToken) {
        router.push('/login');
      } else {
        checkAuth();
      }
    }
  }, [pathname, isAuthOrLanding, checkAuth, router]);

  if (isAuthOrLanding) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] font-sans text-text-primary antialiased">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary antialiased">
      {/* Top Navbar */}
      <Navbar />

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <motion.div
        animate={{ 
          paddingLeft: sidebarOpen ? '256px' : '72px' 
        }}
        transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
        className="min-h-screen pt-16 flex flex-col w-full"
      >
        <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-8 md:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
}
