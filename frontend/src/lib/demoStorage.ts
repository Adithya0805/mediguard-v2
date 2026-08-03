// ============================================================
// Demo Mode local storage — IndexedDB backed.
//
// Every demo record (patient records, generated reports and
// session state) lives in a single "mediguard-demo" database on
// the user's device. Nothing demo-related is ever persisted
// server-side, and all data disappears when the user clears
// browser storage/cache (expected behaviour, not a bug).
//
// All APIs degrade gracefully: if IndexedDB is unavailable
// (private browsing, blocked storage, etc.) they return empty
// results / false instead of throwing, so the demo keeps working
// in memory-only mode.
// ============================================================

export const DEMO_DB_NAME = 'mediguard-demo';
export const DEMO_DB_VERSION = 1;

export const DEMO_STORE_KEYS = {
  patients: 'demoPatients',
  reports: 'demoReports',
  session: 'demoSession',
} as const;

export type DemoStoreName = (typeof DEMO_STORE_KEYS)[keyof typeof DEMO_STORE_KEYS];

export const DEMO_SESSION_KEY = 'mediguard-demo-session';

// ============================================================
// Record shapes
// ============================================================

export interface DemoPatientRecord {
  id: string;
  caseKey: string;
  patientName: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  symptoms: string[];
  medications: string[];
  vitals: Record<string, string | number>;
  createdAt: string;
}

export interface DemoReportRecord {
  id: string;
  patientId: string;
  caseKey: string;
  caseLabel: string;
  createdAt: string;
  results: unknown;
}

export interface DemoSessionState {
  id: string;
  selectedCaseKey: string;
  lastRunReportId: string | null;
  lastRunAt: string | null;
  updatedAt: string;
}

export interface DemoStoreUsage {
  count: number;
  bytes: number;
}

export interface DemoStorageStats {
  available: boolean;
  totalBytes: number;
  stores: Record<DemoStoreName, DemoStoreUsage>;
}

// ============================================================
// Helpers
// ============================================================

function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return 'indexedDB' in window;
  } catch {
    return false;
  }
}

export function isDemoStorageAvailable(): boolean {
  return isIndexedDBAvailable();
}

export function generateDemoId(prefix = 'demo'): string {
  let id = '';
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    }
  } catch {
    id = '';
  }
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  return `${prefix}-${id}`;
}

function estimateBytes(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return 0;
    return new Blob([json]).size;
  } catch {
    return 0;
  }
}

export function formatDemoBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

// ============================================================
// Low-level IndexedDB plumbing
// ============================================================

function openDemoDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!isIndexedDBAvailable()) {
      resolve(null);
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DEMO_DB_NAME, DEMO_DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DEMO_STORE_KEYS.patients)) {
        db.createObjectStore(DEMO_STORE_KEYS.patients, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DEMO_STORE_KEYS.reports)) {
        db.createObjectStore(DEMO_STORE_KEYS.reports, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DEMO_STORE_KEYS.session)) {
        db.createObjectStore(DEMO_STORE_KEYS.session, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function resolveRequest<T>(req: IDBRequest<T>): Promise<boolean> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

async function getAllFromStore<T>(storeName: DemoStoreName): Promise<T[]> {
  const db = await openDemoDB();
  if (!db) return [];
  try {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll() as IDBRequest<T[]>;
    const result = await new Promise<T[]>((resolve) => {
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => resolve([]);
    });
    db.close();
    return result;
  } catch {
    db.close();
    return [];
  }
}

async function putInStore(storeName: DemoStoreName, record: unknown): Promise<boolean> {
  const db = await openDemoDB();
  if (!db) return false;
  try {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(record);
    const ok = await resolveRequest(req);
    db.close();
    return ok;
  } catch {
    db.close();
    return false;
  }
}

async function clearStore(storeName: DemoStoreName): Promise<boolean> {
  const db = await openDemoDB();
  if (!db) return false;
  try {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    const ok = await resolveRequest(req);
    db.close();
    return ok;
  } catch {
    db.close();
    return false;
  }
}

// ============================================================
// Public API
// ============================================================

export async function saveDemoPatient(patient: DemoPatientRecord): Promise<boolean> {
  return putInStore(DEMO_STORE_KEYS.patients, patient);
}

export async function getDemoPatients(): Promise<DemoPatientRecord[]> {
  return getAllFromStore<DemoPatientRecord>(DEMO_STORE_KEYS.patients);
}

export async function saveDemoReport(report: DemoReportRecord): Promise<boolean> {
  return putInStore(DEMO_STORE_KEYS.reports, report);
}

export async function getDemoReports(): Promise<DemoReportRecord[]> {
  return getAllFromStore<DemoReportRecord>(DEMO_STORE_KEYS.reports);
}

export async function saveDemoSessionState(state: DemoSessionState): Promise<boolean> {
  return putInStore(DEMO_STORE_KEYS.session, state);
}

export async function getDemoSessionState(): Promise<DemoSessionState | null> {
  const sessions = await getAllFromStore<DemoSessionState>(DEMO_STORE_KEYS.session);
  return sessions.length > 0 ? sessions[sessions.length - 1] : null;
}

/**
 * Wipes the entire "mediguard-demo" database. If the database is
 * temporarily blocked (e.g. another tab holds a connection open),
 * falls back to clearing every store so the wipe still succeeds.
 */
export async function clearDemoData(): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false;

  try {
    const deleted = await new Promise<boolean>((resolve) => {
      const request = indexedDB.deleteDatabase(DEMO_DB_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    });
    if (deleted) return true;
  } catch {
    // fall through to store-level clear
  }

  const results = await Promise.all([
    clearStore(DEMO_STORE_KEYS.patients),
    clearStore(DEMO_STORE_KEYS.reports),
    clearStore(DEMO_STORE_KEYS.session),
  ]);
  return results.every(Boolean);
}

/**
 * Returns current storage usage for the demo database: total bytes
 * and a record count + byte estimate per store. Never throws.
 */
export async function getDemoStorageStats(): Promise<DemoStorageStats> {
  const [patients, reports, sessions] = await Promise.all([
    getDemoPatients(),
    getDemoReports(),
    getAllFromStore<DemoSessionState>(DEMO_STORE_KEYS.session),
  ]);

  const patientsBytes = estimateBytes(patients);
  const reportsBytes = estimateBytes(reports);
  const sessionBytes = estimateBytes(sessions);

  return {
    available: isIndexedDBAvailable(),
    totalBytes: patientsBytes + reportsBytes + sessionBytes,
    stores: {
      [DEMO_STORE_KEYS.patients]: { count: patients.length, bytes: patientsBytes },
      [DEMO_STORE_KEYS.reports]: { count: reports.length, bytes: reportsBytes },
      [DEMO_STORE_KEYS.session]: { count: sessions.length, bytes: sessionBytes },
    },
  };
}
