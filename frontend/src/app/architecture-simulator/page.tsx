import ArchitectureSimulator from '@/components/architecture/ArchitectureSimulator';
import PipelineExecutionSimulator from '@/components/architecture/PipelineExecutionSimulator';

export const metadata = {
  title: 'Architecture Simulator | MediGuard V2',
  description: 'Explore MediGuard V2 architecture and walk through an illustrative, non-clinical pipeline execution.',
};

export default function ArchitectureSimulatorPage() {
  return (
    <>
      <ArchitectureSimulator />
      <PipelineExecutionSimulator />
    </>
  );
}
