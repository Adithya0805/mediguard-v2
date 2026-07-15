import { useState, useEffect, useCallback, useRef } from 'react';
import { getAnalyticsDashboard } from '@/lib/api';
import { AnalyticsDashboardResponse } from '@/types';

export function useAnalytics(days = 30, pollIntervalMs = 60000) {
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track active days parameter in ref to prevent state-race conditions on slow queries
  const activeDaysRef = useRef(days);

  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const response = await getAnalyticsDashboard(days);
      // Ensure we only store the result if the request matches the current selected days
      if (activeDaysRef.current === days) {
        setData(response);
      }
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || 'Failed to retrieve clinical command center metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [days]);

  // Synchronize ref on days change
  useEffect(() => {
    activeDaysRef.current = days;
    fetchDashboard(false);
  }, [days, fetchDashboard]);

  // Set up polling interval for real-time aggregation refresh
  useEffect(() => {
    if (!pollIntervalMs) return;

    const interval = setInterval(() => {
      fetchDashboard(true);
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [pollIntervalMs, fetchDashboard]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch: () => fetchDashboard(false)
  };
}

export default useAnalytics;
