'use client';

import { useEffect, useState } from 'react';
import { Plus, CalendarCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamilyContext } from '@/hooks/useFamilyContext';
import toast from 'react-hot-toast';

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

function RequestForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: (req: VisitRequest) => void }) {
  const { context } = useFamilyContext();
  const [formData, setFormData] = useState({
    requested_date: '',
    requested_time: '',
    visitor_count: 1,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setError('');
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from('visit_requests')
        .insert({
          clinic_id:        context.clinicId,
          patient_id:       context.patientId,
          family_member_id: context.familyMemberId,
          requested_date:   formData.requested_date,
          requested_time:   formData.requested_time,
          visitor_count:    formData.visitor_count,
          notes:            formData.notes || null,
        })
        .select()
        .single();

      if (insertError) { setError(insertError.message); return; }
      toast.success('Visit request submitted!');
      onSuccess(data as VisitRequest);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Request a Visit</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Preferred Date</label>
            <input
              type="date"
              min={today}
              value={formData.requested_date}
              onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Preferred Time</label>
            <input
              type="time"
              value={formData.requested_time}
              onChange={(e) => setFormData({ ...formData, requested_time: e.target.value })}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Number of Visitors</label>
            <input
              type="number"
              min={1}
              max={10}
              value={formData.visitor_count}
              onChange={(e) => setFormData({ ...formData, visitor_count: parseInt(e.target.value) || 1 })}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requests or information for the care team..."
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FamilyVisitsPage() {
  const { context, isLoading: contextLoading } = useFamilyContext();
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  const handleSuccess = (newReq: VisitRequest) => {
    setRequests((prev) => [newReq, ...prev]);
    setShowForm(false);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Visit Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Request visits to see {context?.residentName}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Request Visit
        </button>
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
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">No visit requests yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 max-w-xs">
            Submit a request and the care team will confirm your visit time.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Request a Visit
          </button>
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

      {showForm && (
        <RequestForm onClose={() => setShowForm(false)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
