'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export default function Select({ className, label, error, options, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            'w-full h-10 px-3 pr-9 border rounded-lg outline-none transition-all duration-150 appearance-none cursor-pointer',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            error
              ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
