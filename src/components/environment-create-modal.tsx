'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useEnvironments } from '@/hooks/use-environments';
import Button from './ui/button';

interface EnvironmentCreateModalProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EnvironmentCreateModal({
  applicationId,
  isOpen,
  onClose
}: EnvironmentCreateModalProps) {
  const { createEnvironment } = useEnvironments(applicationId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateName = (value: string): string | null => {
    if (!value) {
      return 'Name is required';
    }
    if (value.length > 15) {
      return 'Name must be 15 characters or less';
    }
    if (!/^[a-z0-9_-]+$/.test(value)) {
      return 'Name can only contain lowercase letters, numbers, hyphens, and underscores';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createEnvironment({
        name,
        description: description || undefined
      });
      onClose();
      // Reset form
      setName('');
      setDescription('');
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
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Create Environment
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className={`
                w-full px-3 py-2 border rounded-lg
                ${error && !loading ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
                bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              placeholder="e.g., production, staging, dev"
              maxLength={15}
              disabled={loading}
              autoFocus
            />
            {error && !loading && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Lowercase letters, numbers, hyphens, and underscores only. Max 15 characters.
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
            />
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
              {loading ? 'Creating...' : 'Create Environment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}