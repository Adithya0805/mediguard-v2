import { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { getReport } from '@/lib/api';

export function useReport(sessionId: string, sessionStatus?: string) {
  const currentReport = useSessionStore((state) => state.currentReport);
  const setCurrentReport = useSessionStore((state) => state.setCurrentReport);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    // If we have session status and it is NOT completed, skip fetching the report
    if (sessionStatus && sessionStatus !== 'completed') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const report = await getReport(sessionId);
      setCurrentReport(report);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || 'Clinical report is not generated or failed to retrieve.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, sessionStatus, setCurrentReport]);

  useEffect(() => {
    refetch();
  }, [sessionId, refetch]);

  return {
    report: currentReport,
    isLoading,
    error,
    refetch,
  };
}
export default useReport;
