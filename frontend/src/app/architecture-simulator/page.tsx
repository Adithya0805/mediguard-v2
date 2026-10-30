import React from 'react';
import type { Metadata } from 'next';
import ArchitectureSimulator from '@/components/architecture/ArchitectureSimulator';

export const metadata: Metadata = {
  title: 'Architecture Simulator & Diagnostics | MediGuard V2',
  description: 'Interactive execution timeline and diagnostics explorer for MediGuard V2 multi-agent clinical decision support pipeline.',
};

export default function ArchitectureSimulatorPage() {
  return (
    <div className="w-full pb-12">
      <ArchitectureSimulator />
    </div>
  );
}
