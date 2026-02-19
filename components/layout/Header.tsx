'use client';

import { Bell, Search, Plus } from 'lucide-react';
import Link from 'next/link';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showAddButton?: boolean;
  addButtonText?: string;
  addButtonHref?: string;
  onAddClick?: () => void;
}

export default function Header({
  title,
  subtitle,
  showAddButton,
  addButtonText = 'Add New',
  addButtonHref,
  onAddClick,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
        {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Notifications */}
        <button className="relative p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            3
          </span>
        </button>

        {/* Add Button */}
        {showAddButton && addButtonHref && (
          <Link
            href={addButtonHref}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            {addButtonText}
          </Link>
        )}
        
        {showAddButton && !addButtonHref && onAddClick && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            {addButtonText}
          </button>
        )}
      </div>
    </header>
  );
}