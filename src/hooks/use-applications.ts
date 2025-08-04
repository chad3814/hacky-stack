'use client';

import { useState, useEffect, useCallback } from 'react';
import { Application, ApplicationWithHealth } from '@/types/application';

interface UseApplicationsOptions {
  pageSize?: number
}

interface UseApplicationsReturn {
  applications: ApplicationWithHealth[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  createApplication: (data: { name: string; description?: string }) => Promise<Application>
  updateApplication: (id: string, data: Partial<Pick<Application, 'name' | 'description'>>) => Promise<Application>
  deleteApplication: (id: string) => Promise<void>
  refresh: () => void
}

export function useApplications(options: UseApplicationsOptions = {}): UseApplicationsReturn {
  const { pageSize = 6 } = options;
  const [applications, setApplications] = useState<ApplicationWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const addHealthIndicator = (app: Application): ApplicationWithHealth => ({
    ...app,
    isHealthy: Math.random() > 0.3 // Mock 70% healthy rate
  });

  const fetchApplications = useCallback(async (pageNum: number, reset = false, retryCount = 0) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const response = await fetch(`/api/applications?page=${pageNum}&limit=${pageSize}`);
      
      if (!response.ok) {
        if (response.status >= 500 && retryCount < 2) {
          // Retry server errors up to 2 times
          setTimeout(() => {
            fetchApplications(pageNum, reset, retryCount + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff
          return;
        }
        throw new Error(`Failed to fetch applications (${response.status})`);
      }

      const data = await response.json();
      const applicationsWithHealth = data.applications.map(addHealthIndicator);
      
      if (reset || pageNum === 1) {
        setApplications(applicationsWithHealth);
      } else {
        setApplications(prev => [...prev, ...applicationsWithHealth]);
      }

      setHasMore(data.applications.length === pageSize);
      setError(null);
    } catch (err) {
      if (retryCount < 2 && (err instanceof TypeError || (err instanceof Error && err.message.includes('fetch')))) {
        // Retry network errors
        setTimeout(() => {
          fetchApplications(pageNum, reset, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchApplications(nextPage);
    }
  }, [fetchApplications, hasMore, loadingMore, page]);

  const refresh = useCallback(() => {
    setPage(1);
    fetchApplications(1, true);
  }, [fetchApplications]);

  const createApplication = useCallback(async (data: { name: string; description?: string }) => {
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create application');
      }

      const newApplication = await response.json();
      const appWithHealth = addHealthIndicator(newApplication);
      
      // Add to the beginning of the list
      setApplications(prev => [appWithHealth, ...prev]);
      
      return newApplication;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create application';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateApplication = useCallback(async (id: string, data: Partial<Pick<Application, 'name' | 'description'>>) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update application');
      }

      const updatedApplication = await response.json();
      
      // Update in the list
      setApplications(prev => 
        prev.map(app => 
          app.id === id 
            ? { ...addHealthIndicator(updatedApplication) }
            : app
        )
      );
      
      return updatedApplication;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteApplication = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete application');
      }

      // Remove from the list
      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetchApplications(1, true);
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    hasMore,
    loadMore,
    createApplication,
    updateApplication,
    deleteApplication,
    refresh,
  };
}