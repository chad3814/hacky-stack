'use client'

import { useState, useEffect, useRef } from 'react'

interface EditableTextProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  className?: string
  placeholder?: string
  multiline?: boolean
  disabled?: boolean
}

export default function EditableText({
  value,
  onSave,
  className = '',
  placeholder = 'Click to edit',
  multiline = false,
  disabled = false
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (!multiline) {
        ;(inputRef.current as HTMLInputElement).select()
      }
    }
  }, [isEditing, multiline])

  const handleStartEdit = () => {
    if (!disabled) {
      setIsEditing(true)
      setError(null)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    setError(null)
  }

  const handleSave = async () => {
    if (editValue.trim() === value.trim()) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSave(editValue.trim())
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleBlur = () => {
    if (!loading) {
      handleSave()
    }
  }

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input'
    return (
      <div className="space-y-1">
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={loading}
          className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 ${
            multiline ? 'resize-none min-h-[80px]' : ''
          } ${className}`}
          {...(multiline ? { rows: 3 } : { type: 'text' })}
        />
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        {multiline && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Press Ctrl/Cmd+Enter to save, Escape to cancel
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1 transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
    >
      {value || (
        <span className="text-slate-400 dark:text-slate-500 italic">
          {placeholder}
        </span>
      )}
    </div>
  )
}