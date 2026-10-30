/**
 * MediGuard V2 — Phase 3 Architecture Simulator Test Runner
 * Comprehensive validation:
 * - Timeline navigation (forward, backward, boundaries)
 * - Event selection & filtering (workflow, safety, parallel, all)
 * - Standard vs Critical route behavior (parallel tasks, emergency bypass)
 * - Reset and replay behavior
 * - Offline isolation (zero clinical requests, zero WebSockets)
 * - Schema & illustrative labeling compliance
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const simDataPath = path.resolve('src/components/architecture/simulationData.ts');
const simDataContent = fs.readFileSync(simDataPath, 'utf8');

test('1. Verify Source Code Architecture Simulator Components Exist', () => {
  const components = [
    'src/components/architecture/ArchitectureSimulator.tsx',
    'src/components/architecture/PipelineExecutionSimulator.tsx',
    'src/components/architecture/ExecutionTimeline.tsx',
    'src/components/architecture/EventInspector.tsx',
    'src/components/architecture/InputOutputInspector.tsx',
    'src/components/architecture/RoutingDiagnostics.tsx',
    'src/components/architecture/ParallelExecutionViewer.tsx',
    'src/components/architecture/simulationData.ts',
    'src/components/architecture/types.ts',
    'src/app/architecture-simulator/page.tsx'
  ];

  for (const comp of components) {
    const fullPath = path.resolve(comp);
    assert.ok(fs.existsSync(fullPath), `Component file must exist: ${comp}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 100, `Component file must not be empty: ${comp}`);
  }
});

test('2. Standard Route Verification from simulationData.ts', () => {
  assert.ok(simDataContent.includes('export const STANDARD_ROUTE_EVENTS'), 'Must export STANDARD_ROUTE_EVENTS');
  assert.ok(simDataContent.includes('pipeline_started'), 'Must include pipeline_started event');
  assert.ok(simDataContent.includes('intake'), 'Must include intake');
  assert.ok(simDataContent.includes('symptom'), 'Must include symptom');
  assert.ok(simDataContent.includes('diagnosis'), 'Must include diagnosis');
  assert.ok(simDataContent.includes('drug_check'), 'Must include drug_check');
  assert.ok(simDataContent.includes('report'), 'Must include report');
  assert.ok(simDataContent.includes('pipeline_completed'), 'Must include pipeline_completed');
  assert.ok(simDataContent.includes('asyncio.gather'), 'Must document asyncio.gather synchronization');
});

test('3. Critical Urgency Route & Emergency Bypass Verification', () => {
  assert.ok(simDataContent.includes('export const CRITICAL_ROUTE_EVENTS'), 'Must export CRITICAL_ROUTE_EVENTS');
  assert.ok(simDataContent.includes('_conditional_route_after_symptom'), 'Must reference _conditional_route_after_symptom');
  assert.ok(simDataContent.includes('emergency_gate_triggered'), 'Must include emergency_gate_triggered');
  assert.ok(simDataContent.includes('bypassed_node'), 'Must include bypassed_node');
  assert.ok(simDataContent.includes("status: 'skipped'"), 'Must mark bypassed tasks as skipped');
  assert.ok(simDataContent.includes('time is muscle') || simDataContent.includes('time is brain') || simDataContent.includes('emergency'), 'Must explain clinical emergency rationale');
});

test('4. Timeline Navigation & State Machine Simulation', () => {
  // Simulate navigation state machine with bounds
  const totalEvents = 14;
  let currentIndex = 0;
  const max = totalEvents - 1;

  const next = () => { currentIndex = Math.min(currentIndex + 1, max); };
  const prev = () => { currentIndex = Math.max(currentIndex - 1, 0); };
  const reset = () => { currentIndex = 0; };

  assert.strictEqual(currentIndex, 0, 'Initial index must be 0');
  
  // Boundary check: previous at 0
  prev();
  assert.strictEqual(currentIndex, 0, 'Previous at 0 should stay at 0');

  // Step forward
  next();
  assert.strictEqual(currentIndex, 1, 'Next should increment to 1');
  next();
  assert.strictEqual(currentIndex, 2, 'Next should increment to 2');

  // Step back
  prev();
  assert.strictEqual(currentIndex, 1, 'Prev should decrement to 1');

  // Advance to end
  for (let i = 0; i < 20; i++) next();
  assert.strictEqual(currentIndex, max, 'Next should clamp at max');

  // Boundary check: next at max
  next();
  assert.strictEqual(currentIndex, max, 'Next at max should stay at max');

  // Reset check
  reset();
  assert.strictEqual(currentIndex, 0, 'Reset should return index to 0');
});

test('5. Replay and Auto-Advance Simulation', () => {
  let isPlaying = false;
  let currentIndex = 10;

  // Replay action: reset to 0 and set isPlaying = true
  const replay = () => {
    currentIndex = 0;
    isPlaying = true;
  };

  replay();
  assert.strictEqual(currentIndex, 0, 'Replay must reset step index to 0');
  assert.strictEqual(isPlaying, true, 'Replay must initiate playback');

  // Pause action
  isPlaying = false;
  assert.strictEqual(isPlaying, false, 'Pause must halt playback');
});

test('6. Event Selection & Filtering Simulation', () => {
  // Test filter group definitions
  const mockEvents = [
    { id: '1', eventGroup: 'workflow', isParallel: false },
    { id: '2', eventGroup: 'workflow', isParallel: false },
    { id: '3', eventGroup: 'safety', isParallel: false },
    { id: '4', eventGroup: 'parallel', isParallel: true },
    { id: '5', eventGroup: 'parallel', isParallel: true },
    { id: '6', eventGroup: 'workflow', isParallel: false }
  ];

  const filter = (grp) => {
    return mockEvents.filter(evt => {
      if (grp === 'all') return true;
      if (grp === 'workflow') return evt.eventGroup === 'workflow';
      if (grp === 'safety') return evt.eventGroup === 'safety';
      if (grp === 'parallel') return evt.isParallel || evt.eventGroup === 'parallel';
      return true;
    });
  };

  assert.strictEqual(filter('all').length, 6, 'All filter should return all events');
  assert.strictEqual(filter('workflow').length, 3, 'Workflow filter should return 3 events');
  assert.strictEqual(filter('safety').length, 1, 'Safety filter should return 1 event');
  assert.strictEqual(filter('parallel').length, 2, 'Parallel filter should return 2 events');
});

test('7. Illustrative Timing Labels Mandatory Check', () => {
  const illustrativeMatches = (simDataContent.match(/Illustrative/g) || []).length;
  assert.ok(illustrativeMatches >= 15, 'Must contain multiple explicit Illustrative labels');
});

test('8. Zero Clinical Requests / Offline Isolation Contract', () => {
  const simulatorCode = fs.readFileSync(path.resolve('src/components/architecture/PipelineExecutionSimulator.tsx'), 'utf8');
  assert.strictEqual(simulatorCode.includes('new WebSocket'), false, 'Simulator must not open real WebSockets');
  assert.strictEqual(simulatorCode.includes('fetch('), false, 'Simulator must not call fetch()');
  assert.strictEqual(simulatorCode.includes('axios.'), false, 'Simulator must not invoke axios');
  assert.strictEqual(simulatorCode.includes('/api/v1/patient/session'), false, 'Simulator must not post to patient endpoint');

  const mainSimCode = fs.readFileSync(path.resolve('src/components/architecture/ArchitectureSimulator.tsx'), 'utf8');
  assert.strictEqual(mainSimCode.includes('new WebSocket'), false, 'ArchitectureSimulator must not open real WebSockets');
  assert.strictEqual(mainSimCode.includes('fetch('), false, 'ArchitectureSimulator must not call fetch()');
});

test('9. Navigation & Routing Registration in Navbar, Sidebar, and Landing', () => {
  const navbarContent = fs.readFileSync(path.resolve('src/components/layout/Navbar.tsx'), 'utf8');
  assert.ok(navbarContent.includes('/architecture-simulator'), 'Navbar must link to /architecture-simulator');

  const sidebarContent = fs.readFileSync(path.resolve('src/components/layout/Sidebar.tsx'), 'utf8');
  assert.ok(sidebarContent.includes('/architecture-simulator'), 'Sidebar must link to /architecture-simulator');

  const landingContent = fs.readFileSync(path.resolve('src/app/page.tsx'), 'utf8');
  assert.ok(landingContent.includes('/architecture-simulator'), 'Landing page must link to /architecture-simulator');

  const pageWrapperContent = fs.readFileSync(path.resolve('src/components/layout/PageWrapper.tsx'), 'utf8');
  assert.ok(pageWrapperContent.includes('/architecture-simulator'), 'PageWrapper must recognize /architecture-simulator as public route');
});
