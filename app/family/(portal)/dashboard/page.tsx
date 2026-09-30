'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, AlertTriangle, CalendarCheck, Heart, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { londonDate } from '@/lib/emar';
import { useFamilyContext } from '@/hooks/useFamilyContext';
import { formatRelativeTime } from '@/lib/utils';

type Summary = {
  lastCareNoteDate: string | null;
  lastMoodScore: number | null;
  pendingVisits: number;
  recentIncidents: number;
};

const MOOD_LABEL: Record<number, string> = {
  1: 'Distressed',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Great',
};

const MOOD_COLOR: Record<number, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-amber-500',
  4: 'text-emerald-500',
  5: 'text-emerald-600',
};

export default function FamilyDashboardPage() {
  const { context, isLoading: contextLoading } = useFamilyContext();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!context) return;

    async function load() {
      const supabase = createClient();

      const [careNotesRes, incidentsRes, visitsRes] = await Promise.all([
        supabase.rpc('family_care_notes', { p_patient_id: context!.patientId, p_limit: 1 }),
        supabase.rpc('family_incidents', { p_patient_id: context!.patientId }),
        supabase
          .from('visit_requests')
          .select('id')
          .eq('family_member_id', context!.familyMemberId)
          .eq('status', 'pending'),
      ]);

      const since = londonDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const latest = (careNotesRes.data as { date: string; mood_score: number | null }[] | null)?.[0];
      const incidents = (incidentsRes.data as { date: string }[] | null) ?? [];

      setSummary({
        lastCareNoteDate:  latest?.date ?? null,
        lastMoodScore:     latest?.mood_score ?? null,
        pendingVisits:     visitsRes.data?.length ?? 0,
        recentIncidents:   incidents.filter((i) => i.date >= since).length,
      });
      setIsLoading(false);
    }

    load();
  }, [context]);

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Hello, {context?.memberName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Staying connected with <span className="font-medium text-sky-600 dark:text-sky-400">{context?.residentName}</span>
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Last care note */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-sky-50 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Care Note</span>
          </div>
          {isLoading ? (
            <div className="h-7 w-28 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
          ) : summary?.lastCareNoteDate ? (
            <>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">
                {formatRelativeTime(summary.lastCareNoteDate)}
              </p>
              {summary.lastMoodScore && (
                <p className={`text-sm mt-0.5 font-medium ${MOOD_COLOR[summary.lastMoodScore]}`}>
                  Mood: {MOOD_LABEL[summary.lastMoodScore]}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No records yet</p>
          )}
        </div>

        {/* Pending visits */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Visit Requests</span>
          </div>
          {isLoading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <p className="text-lg font-semibold text-gray-800 dark:text-white">
              {summary?.pendingVisits ?? 0} pending
            </p>
          )}
        </div>

        {/* Recent incidents */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Incidents (30 days)</span>
          </div>
          {isLoading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <p className="text-lg font-semibold text-gray-800 dark:text-white">
              {summary?.recentIncidents ?? 0} reported
            </p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
        {[
          { href: '/family/care-notes',  label: 'Care notes',         sub: 'Daily updates about your relative',      icon: BookOpen,      color: 'text-sky-500' },
          { href: '/family/incidents',   label: 'Incident log',       sub: 'See reported incidents',                 icon: AlertTriangle, color: 'text-amber-500' },
          { href: '/family/visits',      label: 'Scheduled visits',   sub: 'View upcoming visits',                   icon: CalendarCheck, color: 'text-emerald-500' },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className={`w-9 h-9 bg-gray-50 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-xl">
        <Heart className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
        <p className="text-sm text-sky-700 dark:text-sky-300">
          This portal shows care updates shared by the care home team. For urgent matters, please contact the home directly.
        </p>
      </div>
    </div>
  );
}
