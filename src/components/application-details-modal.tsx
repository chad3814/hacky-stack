'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Application } from '@/types/application'
import { useApplications } from '@/hooks/use-applications'
import EditableText from './ui/editable-text'
import EditableTextarea from './ui/editable-textarea'
import Button from './ui/button'

interface ApplicationDetailsModalProps {
  applicationId: string
  isOpen: boolean
  onClose: () => void
}

export default function ApplicationDetailsModal({
  applicationId,
  isOpen,
  onClose
}: ApplicationDetailsModalProps) {
  const router = useRouter()
  const { updateApplication } = useApplications()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchApplication()
    }
  }, [isOpen, applicationId]) // fetchApplication is stable

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const fetchApplication = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/applications/${applicationId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch application')
      }
      
      const data = await response.json()
      setApplication(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateName = async (newName: string) => {
    if (!application) return
    
    const updated = await updateApplication(application.id, { name: newName })
    setApplication(updated)
  }

  const handleUpdateDescription = async (newDescription: string) => {
    if (!application) return
    
    const updated = await updateApplication(application.id, { 
      description: newDescription || null 
    })
    setApplication(updated)
  }

  const handleClose = () => {
    onClose()
    router.push('/')
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-4 bg-white dark:bg-slate-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="h-full overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading application...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
                <Button onClick={fetchApplication} variant="secondary">
                  Try Again
                </Button>
              </div>
            </div>
          ) : application ? (
            <div className="p-8">
              {/* Header Section */}
              <div className="mb-8">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Application Name
                  </label>
                  <EditableText
                    value={application.name}
                    onSave={handleUpdateName}
                    className="text-3xl font-bold text-slate-900 dark:text-slate-100"
                    placeholder="Enter application name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Description
                  </label>
                  <EditableTextarea
                    value={application.description || ''}
                    onSave={handleUpdateDescription}
                    className="text-slate-700 dark:text-slate-300 min-h-[60px]"
                    placeholder="Add a description for this application"
                  />
                </div>
              </div>

              {/* Navigation Links */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 opacity-50">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-md flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-700 dark:text-slate-300">Secrets</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage sensitive configuration</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 opacity-50">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-md flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-700 dark:text-slate-300">Variables</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage environment variables</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environments Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Environments
                </h3>
                
                {/* Empty State */}
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
                  <Button disabled variant="secondary">
                    Add Your First Environment
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}