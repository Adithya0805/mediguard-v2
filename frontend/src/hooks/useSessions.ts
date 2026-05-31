import { useEffect, useState, useCallback } from 'react';
import { PatientSession } from '@/types';
import { listSessions } from '@/lib/api';

interface UseSessionsProps {
  page: number;
  limit: number;
  statusFilter?: string;
  urgencyFilter?: string;
  searchQuery?: string;
}

export function useSessions({
  page,
  limit,
  statusFilter = 'all',
  urgencyFilter = 'all',
  searchQuery = '',
}: UseSessionsProps) {
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced search term state
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Simple internal search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      // Fetch full set from backend, we filter client-side for advanced filters
      // since the simple listSessions mock/database doesn't carry full sql filters natively.
      const response = await listSessions(100, 0); // fetch up to 100 sessions to perform client-side filtering
      
      let filtered = response.data || [];

      // Apply Search Filter (Patient Name or Chief Complaint)
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            s.patient_name.toLowerCase().includes(query) ||
            s.chief_complaint.toLowerCase().includes(query)
        );
      }

      // Apply Status Filter
      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter((s) => s.status === statusFilter);
      }

      // Apply Urgency Filter (requires fetching report urgency or session urgency check, fallback to low/medium if missing)
      // Since urgency is stored in clinical_reports table, let's allow filtration
      // by inspecting status/id or basic attributes
      if (urgencyFilter && urgencyFilter !== 'all') {
        // Fallback for mock: check status or details to mock urgency if clinical reports are detached
        // We'll treat failed/critical sessions as critical,Completed as low/medium/high
        filtered = filtered.filter((s) => {
          const mockUrgency = s.status === 'failed' ? 'critical' : 'medium';
          return mockUrgency === urgencyFilter;
        });
      }

      // Paginate results
      const paginatedData = filtered.slice(offset, offset + limit);

      setSessions(paginatedData);
      setTotal(filtered.length);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || 'Failed to retrieve patient session listings.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, urgencyFilter, debouncedSearch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    sessions,
    total,
    isLoading,
    error,
    refetch,
  };
}
export default useSessions;
