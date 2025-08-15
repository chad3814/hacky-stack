'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { 
  EnvironmentWithCounts, 
  CreateEnvironmentInput, 
  UpdateEnvironmentInput 
} from '@/types/environment';

export function useEnvironments(applicationId: string) {
  const [environments, setEnvironments] = useState<EnvironmentWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Fetch environments
  const fetchEnvironments = useCallback(async () => {
    if (!applicationId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/applications/${applicationId}/environments`);
      if (!response.ok) {
        throw new Error('Failed to fetch environments');
      }
      
      const data = await response.json();
      setEnvironments(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load environments';
      setError(message);
      showToast({
        type: 'error',
        title: 'Error',
        message
      });
    } finally {
      setLoading(false);
    }
  }, [applicationId, showToast]);

  // Create environment
  const createEnvironment = useCallback(async (input: CreateEnvironmentInput) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create environment');
      }

      // Optimistic update
      setEnvironments(prev => [...prev, data]);
      
      showToast({
        type: 'success',
        title: 'Environment created',
        message: `${data.name} has been created successfully`
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create environment';
      showToast({
        type: 'error',
        title: 'Error',
        message
      });
      throw err;
    }
  }, [applicationId, showToast]);

  // Update environment
  const updateEnvironment = useCallback(async (environmentId: string, input: UpdateEnvironmentInput) => {
    try {
      const response = await fetch(`/api/environments/${environmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update environment');
      }

      // Optimistic update
      setEnvironments(prev => prev.map(env => 
        env.id === environmentId ? data : env
      ));
      
      showToast({
        type: 'success',
        title: 'Environment updated',
        message: 'Environment has been updated successfully'
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update environment';
      showToast({
        type: 'error',
        title: 'Error',
        message
      });
      throw err;
    }
  }, [showToast]);

  // Delete environment
  const deleteEnvironment = useCallback(async (environmentId: string) => {
    try {
      const response = await fetch(`/api/environments/${environmentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete environment');
      }

      // Optimistic update
      setEnvironments(prev => prev.filter(env => env.id !== environmentId));
      
      showToast({
        type: 'success',
        title: 'Environment deleted',
        message: 'Environment has been deleted successfully'
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete environment';
      
      // Check if it's a resource conflict error
      if (message.includes('attached resources')) {
        showToast({
          type: 'error',
          title: 'Cannot delete environment',
          message
        });
      } else {
        showToast({
          type: 'error',
          title: 'Error',
          message
        });
      }
      throw err;
    }
  }, [showToast]);

  // Load environments on mount
  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  return {
    environments,
    loading,
    error,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    refreshEnvironments: fetchEnvironments
  };
}