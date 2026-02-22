'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '@/lib/store';
import { useUser } from '@/hooks/useUser';
import { Incident } from '@/lib/types';

interface Props {
  onClose: () => void;
}

const INCIDENT_TYPES: { value: Incident['incidentType']; label: string }[] = [
  { value: 'fall',             label: 'Fall' },
  { value: 'medication_error', label: 'Medication Error' },
  { value: 'safeguarding',     label: 'Safeguarding' },
  { value: 'behavioural',      label: 'Behavioural' },
  { value: 'accident',         label: 'Accident' },
  { value: 'near_miss',        label: 'Near Miss' },
  { value: 'other',            label: 'Other' },
];

const SEVERITIES: { value: Incident['severity']; label: string }[] = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function IncidentForm({ onClose }: Props) {
  const user = useUser();
  const { patients, addIncident } = useStore((s) => ({
    patients: s.patients,
    addIncident: s.addIncident,
  }));

  const todayISO = new Date().toISOString().split('T')[0];
  const nowTime  = new Date().toTimeString().slice(0, 5);

  const [patientId,       setPatientId]       = useState('');
  const [date,            setDate]            = useState(todayISO);
  const [time,            setTime]            = useState(nowTime);
  const [incidentType,    setIncidentType]    = useState<Incident['incidentType']>('fall');
  const [location,        setLocation]        = useState('');
  const [description,     setDescription]     = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [witnesses,       setWitnesses]       = useState('');
  const [severity,        setSeverity]        = useState<Incident['severity']>('low');
  const [followUp,        setFollowUp]        = useState(false);
  const [followUpNotes,   setFollowUpNotes]   = useState('');
  const [submitting,      setSubmitting]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !description || !immediateAction) return;

    const reportedBy   = user?.user_metadata?.full_name || user?.email || 'Unknown';
    const reportedById = user?.id ?? '';

    setSubmitting(true);
    try {
      await addIncident({
        patientId,
        reportedBy,
        reportedById,
        date,
        time,
        incidentType,
        location,
        description,
        immediateAction,
        witnesses,
        severity,
        followUp,
        followUpNotes,
        status: 'open',
        internalNotes: '',
      });
      if (severity === 'critical') {
        toast.error('⚠ Critical incident logged.');
      } else {
        toast.success('Incident report submitted.');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit incident.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient */}
      <div>
        <label className={labelCls}>Patient <span className="text-red-500">*</span></label>
        <select
          required
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className={inputCls}
        >
          <option value="">Select patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date <span className="text-red-500">*</span></label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Time <span className="text-red-500">*</span></label>
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Incident type */}
      <div>
        <label className={labelCls}>Incident Type <span className="text-red-500">*</span></label>
        <select value={incidentType} onChange={(e) => setIncidentType(e.target.value as Incident['incidentType'])} className={inputCls}>
          {INCIDENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div>
        <label className={labelCls}>Location</label>
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bedroom 3, Dining Room" className={inputCls} />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description <span className="text-red-500">*</span></label>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened…"
          className={inputCls}
        />
      </div>

      {/* Immediate action */}
      <div>
        <label className={labelCls}>Immediate Action Taken <span className="text-red-500">*</span></label>
        <textarea
          required
          rows={3}
          value={immediateAction}
          onChange={(e) => setImmediateAction(e.target.value)}
          placeholder="What was done immediately after the incident?"
          className={inputCls}
        />
      </div>

      {/* Witnesses */}
      <div>
        <label className={labelCls}>Witnesses</label>
        <input type="text" value={witnesses} onChange={(e) => setWitnesses(e.target.value)} placeholder="Names of any witnesses" className={inputCls} />
      </div>

      {/* Severity */}
      <div>
        <label className={labelCls}>Severity <span className="text-red-500">*</span></label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Incident['severity'])} className={inputCls}>
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Follow-up */}
      <div className="flex items-center gap-3">
        <input
          id="follow-up"
          type="checkbox"
          checked={followUp}
          onChange={(e) => setFollowUp(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
        />
        <label htmlFor="follow-up" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Follow-up required
        </label>
      </div>

      {followUp && (
        <div>
          <label className={labelCls}>Follow-up Notes</label>
          <textarea
            rows={2}
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
            placeholder="What follow-up is required?"
            className={inputCls}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
}
