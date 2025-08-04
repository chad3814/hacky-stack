'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className = '', ...props }, ref) => {
    const inputClasses = `
      w-full px-3 py-2 border rounded-md shadow-sm transition-colors
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
    `.trim();

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;