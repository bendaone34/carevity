'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamilyContext } from '@/hooks/useFamilyContext';

type IncidentRow = {
  id: string;
  date: string;
  time: string;
  incident_type: string;
  severity: 'low' | 'medium';
  description: string;
  status: string;
};

const TYPE_LABELS: Record<string, string> = {
  fall:             'Fall',
  medication_error: 'Medication',
  safeguarding:     'Safeguarding',
  behavioural:      'Behavioural',
  accident:         'Accident',
  near_miss:        'Near Miss',
  other:            'Other',
};

const SEVERITY_CLASSES: Record<string, string> = {
  low:    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

const STATUS_CLASSES: Record<string, string> = {
  open:         'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  under_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  resolved:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const STATUS_LABELS: Record<string, string> = {
  open:         'Open',
  under_review: 'Being Reviewed',
  resolved:     'Resolved',
};

export default function FamilyIncidentsPage() {
  const { context, isLoading: contextLoading } = useFamilyContext();
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!context) return;

    async function load() {
      const supabase = createClient();
      // Column-limited RPC: internal notes and witnesses are never sent to family
      const { data, error } = await supabase.rpc('family_incidents', {
        p_patient_id: context!.patientId,
      });

      if (!error && data) setIncidents(data as IncidentRow[]);
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
    <div className="animate-fadeIn space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Incidents</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Reported incidents for {context?.residentName}</p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          This log shows recorded incidents. For any urgent concerns, please contact the care home directly by phone.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-slate-700 last:border-0">
              <div className="w-16 h-4 bg-gray-100 dark:bg-slate-700 rounded" />
              <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-700 rounded" />
              <div className="w-14 h-6 bg-gray-100 dark:bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">No incidents recorded</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No incidents have been reported for {context?.residentName}.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Description</th>
                  <th className="px-5 py-3 text-left">Severity</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {new Date(inc.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {TYPE_LABELS[inc.incident_type] ?? inc.incident_type}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {inc.description}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${SEVERITY_CLASSES[inc.severity]}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[inc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[inc.status] ?? inc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
