'use client';

import { Bell, Plus } from 'lucide-react';
import Link from 'next/link';
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
    <header className="flex items-start justify-between mb-6 lg:mb-8 gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <Link
          href="/incidents"
          className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title={notificationCount > 0 ? `${notificationCount} item${notificationCount > 1 ? 's' : ''} need attention` : 'No alerts'}
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Link>

        {/* Add Button */}
        {showAddButton && addButtonHref && (
          <Link
            href={addButtonHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-3.5 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {addButtonText}
          </Link>
        )}
        {showAddButton && !addButtonHref && onAddClick && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-3.5 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {addButtonText}
          </button>
        )}
      </div>
    </header>
  );
}
