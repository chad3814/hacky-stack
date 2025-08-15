'use client';

import { useState, useEffect, FormEvent } from 'react';
import { EnvironmentWithCounts } from '@/types/environment';
import { useEnvironments } from '@/hooks/use-environments';
import Button from './ui/button';

interface EnvironmentEditModalProps {
  environment: EnvironmentWithCounts;
  isOpen: boolean;
  onClose: () => void;
}

export default function EnvironmentEditModal({
  environment,
  isOpen,
  onClose
}: EnvironmentEditModalProps) {
  const { updateEnvironment } = useEnvironments(environment.applicationId);
  const [description, setDescription] = useState(environment.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset to current value when modal opens
      setDescription(environment.description || '');
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, environment.description]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      await updateEnvironment(environment.id, {
        description: description || null
      });
      onClose();
    } catch {
      // Error is already handled by the hook with toast
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
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Edit Environment
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={environment.name}
              className="
                w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-slate-100 dark:bg-slate-800
                text-slate-900 dark:text-slate-100
                cursor-not-allowed opacity-60
              "
              disabled
              readOnly
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Environment names cannot be changed after creation
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="
                w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none
              "
              placeholder="Optional description for this environment"
              rows={3}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <div>Created: {new Date(environment.createdAt).toLocaleString()}</div>
              <div>Last modified: {new Date(environment.updatedAt).toLocaleString()}</div>
              <div>Resources: {environment._count.secrets} secrets, {environment._count.variables} variables</div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}