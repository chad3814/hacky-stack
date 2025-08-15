'use client';

import { useState, useEffect } from 'react';
import { EnvironmentWithCounts } from '@/types/environment';
import { useEnvironments } from '@/hooks/use-environments';
import Button from './ui/button';

interface EnvironmentDeleteModalProps {
  environment: EnvironmentWithCounts;
  isOpen: boolean;
  onClose: () => void;
}

export default function EnvironmentDeleteModal({
  environment,
  isOpen,
  onClose
}: EnvironmentDeleteModalProps) {
  const { deleteEnvironment } = useEnvironments(environment.applicationId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResources = environment._count.secrets > 0 || environment._count.variables > 0;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleDelete = async () => {
    if (hasResources) {
      setError(`Cannot delete environment with attached resources (${environment._count.secrets} secrets, ${environment._count.variables} variables)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteEnvironment(environment.id);
      onClose();
    } catch (err) {
      // Error is already handled by the hook with toast
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Delete Environment
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete the <strong className="text-slate-900 dark:text-slate-100">{environment.name}</strong> environment? 
              This action cannot be undone.
            </p>
          </div>
        </div>

        {hasResources && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Cannot delete environment with attached resources
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This environment has {environment._count.secrets} secret{environment._count.secrets !== 1 ? 's' : ''} and {environment._count.variables} variable{environment._count.variables !== 1 ? 's' : ''} attached. 
                  Remove all resources before deleting the environment.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && !hasResources && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-4">
            <div>Created: {new Date(environment.createdAt).toLocaleString()}</div>
            <div>Resources: {environment._count.secrets} secrets, {environment._count.variables} variables</div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            variant="primary"
            disabled={loading || hasResources}
            className={hasResources ? '' : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'}
          >
            {loading ? 'Deleting...' : 'Delete Environment'}
          </Button>
        </div>
      </div>
    </div>
  );
}