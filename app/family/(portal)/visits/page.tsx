'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamilyContext } from '@/hooks/useFamilyContext';

type VisitRequest = {
  id: string;
  requested_date: string;
  requested_time: string;
  visitor_count: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'declined';
  staff_notes: string | null;
  created_at: string;
};

const STATUS_CLASSES: Record<VisitRequest['status'], string> = {
  pending:  'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  declined: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_LABELS: Record<VisitRequest['status'], string> = {
  pending:  'Awaiting Review',
  approved: 'Approved',
  declined: 'Declined',
};

export default function FamilyVisitsPage() {
  const { context, isLoading: contextLoading } = useFamilyContext();
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!context) return;

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('visit_requests')
        .select('id, requested_date, requested_time, visitor_count, notes, status, staff_notes, created_at')
        .eq('family_member_id', context!.familyMemberId)
        .order('created_at', { ascending: false });

      if (!error && data) setRequests(data as VisitRequest[]);
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

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Scheduled Visits</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Visits arranged for {context?.residentName}. Contact the care home to schedule a visit.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-100 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-24 bg-gray-100 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-100 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8 text-sky-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">No visits scheduled</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
            Contact the care home directly to arrange a visit.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const date = new Date(req.requested_date + 'T00:00:00');
            return (
              <div key={req.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatTime(req.requested_time)} · {req.visitor_count} visitor{req.visitor_count !== 1 ? 's' : ''}
                    </p>
                    {req.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">&ldquo;{req.notes}&rdquo;</p>
                    )}
                    {req.staff_notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Response from care team</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{req.staff_notes}</p>
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASSES[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
