'use client'

import { TextareaHTMLAttributes, forwardRef, useEffect, useRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  required?: boolean
  autoResize?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, autoResize = false, className = '', ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const combinedRef = (node: HTMLTextAreaElement | null) => {
      if (node) {
        textareaRef.current = node
      }
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    const adjustHeight = () => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }

    useEffect(() => {
      adjustHeight()
    }, [props.value])

    const textareaClasses = `
      w-full px-3 py-2 border rounded-md shadow-sm transition-colors resize-none
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      ${error 
        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
        : 'border-slate-300 dark:border-slate-600'
      }
      bg-white dark:bg-slate-800 
      text-slate-900 dark:text-slate-100
      placeholder-slate-400 dark:placeholder-slate-500
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `.trim()

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={combinedRef}
          className={textareaClasses}
          onInput={adjustHeight}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea