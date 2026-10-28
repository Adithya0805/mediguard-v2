import SimulationStudio from '@/components/simulation/SimulationStudio';

export const metadata = {
  title: 'Simulation Studio | MediGuard V2',
  description: 'Explore saved scientific particle trajectories in an isolated visualization workspace.',
};

export default function SimulationStudioPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 text-text-primary md:px-8">
      <div className="mx-auto max-w-[1600px]">
        <SimulationStudio />
      </div>
    </div>
  );
}
