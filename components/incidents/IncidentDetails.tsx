'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '@/lib/store';
import { Incident } from '@/lib/types';

interface Props {
  incident: Incident;
  onClose: () => void;
}

const SEVERITY_CLASSES: Record<Incident['severity'], string> = {
  low:      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  medium:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  high:     'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_CLASSES: Record<Incident['status'], string> = {
  open:         'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  under_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  resolved:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const STATUS_LABELS: Record<Incident['status'], string> = {
  open:         'Open',
  under_review: 'Under Review',
  resolved:     'Resolved',
};

const TYPE_LABELS: Record<Incident['incidentType'], string> = {
  fall:             'Fall',
  medication_error: 'Medication Error',
  safeguarding:     'Safeguarding',
  behavioural:      'Behavioural',
  accident:         'Accident',
  near_miss:        'Near Miss',
  other:            'Other',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{value || '—'}</dd>
    </div>
  );
}

export default function IncidentDetails({ incident, onClose }: Props) {
  const { currentUserRole, updateIncident } = useStore((s) => ({
    currentUserRole: s.currentUserRole,
    updateIncident: s.updateIncident,
  }));

  const [status,        setStatus]        = useState<Incident['status']>(incident.status);
  const [internalNotes, setInternalNotes] = useState(incident.internalNotes);
  const [saving,        setSaving]        = useState(false);

  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateIncident(incident.id, { status, internalNotes });
      toast.success('Incident updated.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update incident.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

  return (
    <div className="space-y-6">
      {/* Header badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${SEVERITY_CLASSES[incident.severity]}`}>
          {incident.severity}
        </span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASSES[incident.status]}`}>
          {STATUS_LABELS[incident.status]}
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
          {TYPE_LABELS[incident.incidentType]}
        </span>
      </div>

      {/* Details grid */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Patient"        value={incident.patientName} />
        <Field label="Reported By"    value={incident.reportedBy} />
        <Field label="Date"           value={incident.date} />
        <Field label="Time"           value={incident.time} />
        <Field label="Location"       value={incident.location} />
        <Field label="Witnesses"      value={incident.witnesses} />
      </dl>

      <div className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{incident.description}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Immediate Action Taken</dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{incident.immediateAction}</dd>
        </div>
        {incident.followUp && (
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Follow-up Notes</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{incident.followUpNotes || '—'}</dd>
          </div>
        )}
      </div>

      {/* Management section */}
      {canManage && (
        <div className="border-t border-gray-200 dark:border-slate-700 pt-5 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Management</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Incident['status'])} className={inputCls}>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal notes (not visible to carers)…"
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {!canManage && (
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
