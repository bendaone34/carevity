'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({ className, label, error, icon, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full h-10 px-3 border rounded-lg outline-none transition-all duration-150',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500',
            error
              ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500',
            icon ? 'pl-10' : '',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
