'use client';

import { useState } from 'react';
import { ApplicationRole } from '@prisma/client';
import { EnvironmentWithCounts } from '@/types/environment';
import { useEnvironments } from '@/hooks/use-environments';
import Button from './ui/button';
import EnvironmentCreateModal from './environment-create-modal';
import EnvironmentEditModal from './environment-edit-modal';
import EnvironmentDeleteModal from './environment-delete-modal';

interface EnvironmentListProps {
  applicationId: string;
  userRole?: ApplicationRole;
}

export default function EnvironmentList({ applicationId, userRole }: EnvironmentListProps) {
  const { environments, loading, error } = useEnvironments(applicationId);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentWithCounts | null>(null);

  const canModify = userRole === ApplicationRole.OWNER || userRole === ApplicationRole.EDITOR;
  const canCreate = canModify && environments.length < 10;

  const handleEdit = (environment: EnvironmentWithCounts) => {
    setSelectedEnvironment(environment);
    setEditModalOpen(true);
  };

  const handleDelete = (environment: EnvironmentWithCounts) => {
    setSelectedEnvironment(environment);
    setDeleteModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading environments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <>
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No environments yet
          </h4>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Create your first environment to start deploying this application.
          </p>
          {canCreate && (
            <Button onClick={() => setCreateModalOpen(true)} variant="secondary">
              Add Your First Environment
            </Button>
          )}
        </div>

        {createModalOpen && (
          <EnvironmentCreateModal
            applicationId={applicationId}
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Environments ({environments.length}/10)
          </h3>
          {canCreate && (
            <Button onClick={() => setCreateModalOpen(true)} variant="secondary" size="sm">
              Add Environment
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {environments.map((environment) => (
            <div
              key={environment.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-medium text-slate-900 dark:text-slate-100">
                      {environment.name}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>{environment._count.secrets} secrets</span>
                      <span>•</span>
                      <span>{environment._count.variables} variables</span>
                    </div>
                  </div>
                  
                  {environment.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {environment.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Created {formatDate(environment.createdAt)}</span>
                    <span>•</span>
                    <span>Modified {formatDate(environment.updatedAt)}</span>
                  </div>
                </div>

                {canModify && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(environment)}
                      className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                      title="Edit environment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(environment)}
                      className="p-2 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                      title="Delete environment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!canCreate && environments.length >= 10 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
            Maximum environment limit reached (10)
          </p>
        )}
      </div>

      {createModalOpen && (
        <EnvironmentCreateModal
          applicationId={applicationId}
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}

      {editModalOpen && selectedEnvironment && (
        <EnvironmentEditModal
          environment={selectedEnvironment}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedEnvironment(null);
          }}
        />
      )}

      {deleteModalOpen && selectedEnvironment && (
        <EnvironmentDeleteModal
          environment={selectedEnvironment}
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedEnvironment(null);
          }}
        />
      )}
    </>
  );
}