import { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { getSession } from '@/lib/api';

export function useSession(sessionId: string) {
  const currentSession = useSessionStore((state) => state.currentSession);
  const isPolling = useSessionStore((state) => state.isPolling);
  const startPolling = useSessionStore((state) => state.startPolling);
  const stopPolling = useSessionStore((state) => state.stopPolling);
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await getSession(sessionId);
      setCurrentSession(session);
      
      if (session.status === 'pending' || session.status === 'processing') {
        startPolling(sessionId);
      } else {
        stopPolling();
      }
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || 'Failed to fetch patient session details.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, startPolling, stopPolling, setCurrentSession]);

  useEffect(() => {
    refetch();

    // Cleanup: Stop polling on component unmount
    return () => {
      stopPolling();
    };
  }, [sessionId, refetch, stopPolling]);

  return {
    session: currentSession,
    isLoading,
    isPolling,
    error,
    refetch,
  };
}
export default useSession;
