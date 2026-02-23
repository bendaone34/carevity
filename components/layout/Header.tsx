'use client';

import { Bell, Search, Plus } from 'lucide-react';
import Link from 'next/link';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import { useStore } from '@/lib/store';
import { useMemo } from 'react';

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
  const incidents      = useStore((s) => s.incidents);
  const medications    = useStore((s) => s.medications);
  const medicationLogs = useStore((s) => s.medicationLogs);

  const notificationCount = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const loggedTodayIds = new Set(
      medicationLogs.filter((l) => l.date === todayISO && !l.refused).map((l) => l.medicationId)
    );
    const unloggedToday = medications.filter(
      (m) => m.status === 'active' && !loggedTodayIds.has(m.id)
    ).length;
    const openCritical = incidents.filter(
      (i) => i.severity === 'critical' && i.status !== 'resolved'
    ).length;
    return openCritical + unloggedToday;
  }, [incidents, medications, medicationLogs]);

  return (
    <header className="flex items-center justify-between mb-6 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white truncate">{title}</h1>
        {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm hidden sm:block">{subtitle}</p>}
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
        <Link
          href="/incidents"
          className="relative p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          title={notificationCount > 0 ? `${notificationCount} alert${notificationCount > 1 ? 's' : ''} require attention` : 'No alerts'}
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Link>

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