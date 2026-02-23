'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { WellbeingAlert } from '@/lib/types';
import { useUser } from '@/hooks/useUser';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { SeverityBadge, ALERT_TYPE_LABELS } from './AlertBadge';

interface AcknowledgeModalProps {
  alert: WellbeingAlert;
  onClose: () => void;
}

export default function AcknowledgeModal({ alert, onClose }: AcknowledgeModalProps) {
  const { acknowledgeAlert } = useStore();
  const user = useUser();
  const staffName = user?.user_metadata?.full_name || user?.email || '';

  const [notes,       setNotes]       = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [saving,      setSaving]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await acknowledgeAlert(alert.id, staffName, notes, actionTaken);
      toast.success('Alert acknowledged');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to acknowledge');
    } finally {
      setSaving(false);
    }
  }

  const triggeredDate = new Date(alert.triggeredAt).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Alert summary */}
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-gray-500 dark:text-gray-400">{ALERT_TYPE_LABELS[alert.alertType]}</span>
        </div>
        <p className="text-sm font-medium text-gray-800 dark:text-white">{alert.patientName}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{alert.message}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Triggered {triggeredDate}</p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Any observations or context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      {/* Action taken */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Action taken <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Spoke with resident, informed GP..."
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" isLoading={saving}>Acknowledge Alert</Button>
      </div>
    </form>
  );
}
