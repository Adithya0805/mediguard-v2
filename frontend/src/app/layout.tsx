import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import PageWrapper from '@/components/layout/PageWrapper';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter' 
});

export const metadata: Metadata = {
  title: 'MediGuard V2 | Multi-Agent Clinical Decision Support',
  description: 'Enterprise-grade clinical decision support software powered by collaborative multi-agent AI, RAG knowledge bases, and FHIR standard integrations.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-[#0a0f1e] text-[#f1f5f9] antialiased">
        {/* Toast Notifications */}
        <Toaster 
          position="top-right" 
          theme="dark" 
          toastOptions={{
            style: {
              background: '#111827',
              borderColor: '#1e293b',
              color: '#f1f5f9'
            }
          }}
          closeButton
          richColors
        />
        
        {/* Global layout framework with route transition animation support */}
        <PageWrapper>
          {children}
        </PageWrapper>
      </body>
    </html>
  );
}
