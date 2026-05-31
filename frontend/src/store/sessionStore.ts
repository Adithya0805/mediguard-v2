import { create } from 'zustand';
import { toast } from 'sonner';
import { PatientSession, ClinicalReportResponse } from '@/types';
import { getSession, getReport } from '@/lib/api';

interface SessionState {
  currentSession: PatientSession | null;
  currentReport: ClinicalReportResponse | null;
  isPolling: boolean;
  pollingIntervalId: NodeJS.Timeout | null;
  setCurrentSession: (session: PatientSession | null) => void;
  setCurrentReport: (report: ClinicalReportResponse | null) => void;
  startPolling: (sessionId: string) => void;
  stopPolling: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  currentReport: null,
  isPolling: false,
  pollingIntervalId: null,

  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentReport: (report) => set({ currentReport: report }),

  startPolling: (sessionId) => {
    // Prevent duplicate polling intervals
    const existingInterval = get().pollingIntervalId;
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    set({ isPolling: true });

    // Initial immediate fetch before starting the interval
    const fetchSession = async () => {
      try {
        const session = await getSession(sessionId);
        set({ currentSession: session });

        if (session.status === 'completed') {
          const report = await getReport(sessionId);
          set({ currentReport: report, isPolling: false });
          toast.success('Clinical analysis successfully completed! Loading report...');
          get().stopPolling();
        } else if (session.status === 'failed') {
          set({ isPolling: false });
          toast.error('Clinical analysis pipeline failed. Please check case logs.');
          get().stopPolling();
        }
      } catch (err) {
        console.error('Polling fetch failed:', err);
      }
    };

    fetchSession();

    // Start polling every 3000ms (3 seconds)
    const intervalId = setInterval(async () => {
      try {
        const session = await getSession(sessionId);
        set({ currentSession: session });

        if (session.status === 'completed') {
          const report = await getReport(sessionId);
          set({ currentReport: report, isPolling: false });
          toast.success('Clinical analysis successfully completed! Loading report...');
          get().stopPolling();
        } else if (session.status === 'failed') {
          set({ isPolling: false });
          toast.error('Clinical analysis pipeline failed. Please check case logs.');
          get().stopPolling();
        }
      } catch (err) {
        console.error('Error during clinical polling:', err);
      }
    }, 3000);

    set({ pollingIntervalId: intervalId });
  },

  stopPolling: () => {
    const intervalId = get().pollingIntervalId;
    if (intervalId) {
      clearInterval(intervalId);
    }
    set({ pollingIntervalId: null, isPolling: false });
  },
}));
