'use client';

import Link from 'next/link';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { WellbeingAlert } from '@/lib/types';
import { ALERT_TYPE_LABELS } from './AlertBadge';

const BANNER_STYLES = {
  high:   'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  low:    'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
};

const ICONS = {
  high:   AlertTriangle,
  medium: AlertCircle,
  low:    Info,
};

interface ResidentAlertBannerProps {
  alerts: WellbeingAlert[];
}

export default function ResidentAlertBanner({ alerts }: ResidentAlertBannerProps) {
  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-2 mb-6">
      {sorted.map((alert) => {
        const Icon = ICONS[alert.severity];
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-4 rounded-xl border ${BANNER_STYLES[alert.severity]}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {ALERT_TYPE_LABELS[alert.alertType]}
              </p>
              <p className="text-sm mt-0.5 opacity-90">{alert.message}</p>
            </div>
            <Link
              href="/alerts"
              className="shrink-0 text-xs font-medium underline opacity-75 hover:opacity-100"
            >
              View →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
