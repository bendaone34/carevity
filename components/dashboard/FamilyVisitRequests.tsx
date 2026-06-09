'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

type VisitRequest = {
  id: string;
  requested_date: string;
  requested_time: string;
  visitor_count: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'declined';
  family_members: {
    name: string;
    relationship: string;
  };
  patients: {
    first_name: string;
    last_name: string;
  };
};

export default function FamilyVisitRequests() {
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('visit_requests')
        .select('id, requested_date, requested_time, visitor_count, notes, status, family_members(name, relationship), patients(first_name, last_name)')
        .eq('status', 'pending')
        .order('requested_date', { ascending: true })
        .limit(10);

      if (data) setRequests(data as unknown as VisitRequest[]);
      setIsLoading(false);
    }

    load();
  }, []);

  const handleReview = async (visitId: string, status: 'approved' | 'declined') => {
    setReviewingId(visitId);
    try {
      const res = await fetch('/api/family/visits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, status }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Failed to update'); return; }

      setRequests((prev) => prev.filter((r) => r.id !== visitId));
      toast.success(status === 'approved' ? 'Visit approved' : 'Visit declined');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setReviewingId(null);
    }
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Visit Requests</h3>
        {requests.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold bg-sky-500 text-white rounded-full">
            {requests.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg animate-pulse bg-gray-50 dark:bg-slate-700/50">
              <div className="h-4 w-36 bg-gray-200 dark:bg-slate-600 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-slate-600 rounded" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-50 dark:bg-slate-700 rounded-xl flex items-center justify-center mb-3">
            <CalendarCheck className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No pending visit requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const date = new Date(req.requested_date + 'T00:00:00');
            const isReviewing = reviewingId === req.id;
            return (
              <div key={req.id} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {req.patients.first_name} {req.patients.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {req.family_members.name} ({req.family_members.relationship})
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at {formatTime(req.requested_time)}
                      {' · '}{req.visitor_count} visitor{req.visitor_count !== 1 ? 's' : ''}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic truncate">{req.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleReview(req.id, 'approved')}
                    disabled={isReviewing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(req.id, 'declined')}
                    disabled={isReviewing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-60 text-red-700 dark:text-red-400 rounded-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
