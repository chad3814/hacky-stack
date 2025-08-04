'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApplicationWithHealth } from '@/types/application'

interface ApplicationCardProps {
  application: ApplicationWithHealth
  onDelete?: (id: string) => void
}

export default function ApplicationCard({ application, onDelete }: ApplicationCardProps) {
  const router = useRouter()
  const [showContextMenu, setShowContextMenu] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push(`/applications/${application.id}`)
  }

  const handleContextMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowContextMenu(!showContextMenu)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowContextMenu(false)
    onDelete?.(application.id)
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="relative">
      <div
        onClick={handleCardClick}
        className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer group"
      >
        {/* Header with name and health indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                application.isHealthy ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {truncateText(application.name, 25)}
            </h3>
          </div>
          
          {/* Context menu button */}
          <button
            onClick={handleContextMenuClick}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-opacity"
          >
            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
          {application.description || 'No description provided'}
        </p>

        {/* Footer */}
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-500">
          Created {new Date(application.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowContextMenu(false)}
          />
          <div className="absolute top-2 right-2 z-20 bg-white dark:bg-slate-700 rounded-md shadow-lg border border-slate-200 dark:border-slate-600 py-1 min-w-[120px]">
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}