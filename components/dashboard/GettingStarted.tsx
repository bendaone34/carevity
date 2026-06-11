'use client';

import { CheckCircle, Circle, Users, ClipboardList, CalendarClock, UserCog, X, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useState } from 'react';

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  cta: string;
  icon: React.ElementType;
  done: boolean;
}

export default function GettingStarted() {
  const { patients, staffMembers, carePlans, shifts } = useStore();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('carevity:setup-dismissed') === '1'; } catch { return false; }
  });
  const [collapsed, setCollapsed] = useState(false);

  const steps: Step[] = [
    {
      id: 'resident',
      label: 'Add your first resident',
      description: 'Add a resident profile to start tracking their care.',
      href: '/patients/new',
      cta: 'Add resident',
      icon: Users,
      done: patients.length > 0,
    },
    {
      id: 'staff',
      label: 'Invite a staff member',
      description: 'Invite your team so they can log care records and shifts.',
      href: '/staff',
      cta: 'Invite staff',
      icon: UserCog,
      done: staffMembers.length > 1,
    },
    {
      id: 'careplan',
      label: 'Create a care plan',
      description: 'Set up a personalised care plan for a resident.',
      href: '/care-plans',
      cta: 'Create care plan',
      icon: ClipboardList,
      done: carePlans.length > 0,
    },
    {
      id: 'shift',
      label: 'Schedule your first shift',
      description: 'Add shifts to the rota so the team knows when to work.',
      href: '/shifts',
      cta: 'Add shift',
      icon: CalendarClock,
      done: shifts.length > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    try { localStorage.setItem('carevity:setup-dismissed', '1'); } catch {}
    setDismissed(true);
  };

  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-sky-800/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Getting started</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{completedCount} of {steps.length} steps complete</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-slate-700">
        <div
          className="h-full bg-sky-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-slate-700">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`p-5 flex flex-col gap-3 ${step.done ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {step.done ? (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 dark:text-slate-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors self-start"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {step.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
