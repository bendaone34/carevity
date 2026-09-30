'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Medication } from '@/lib/types';
import { useUser } from '@/hooks/useUser';
import { londonDate, londonTime } from '@/lib/emar';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { guardOnline } from '@/lib/offline';

interface LogMedicationModalProps {
  medication: Medication;
  /** Dose slot being recorded (HH:MM), or null for as-needed medication */
  scheduledTime: string | null;
  onClose: () => void;
}

export default function LogMedicationModal({ medication, scheduledTime, onClose }: LogMedicationModalProps) {
  const { addMedicationLog } = useStore();
  const user = useUser();
  // Display only — the database records the signed-in user as administering
  const recordedAs = user?.user_metadata?.full_name || user?.email || 'you';

  const [formData, setFormData] = useState(() => {
    const now = new Date();
    return { date: londonDate(now), time: londonTime(now), refused: false, notes: '' };
  });
  // One key per log attempt: a retried or double-submitted request can't
  // create a second record.
  const [clientRequestId] = useState(() => crypto.randomUUID());

  const [isSaving, setIsSaving] = useState(false);

  const setField = (field: keyof typeof formData, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.refused && !formData.notes.trim()) {
      toast.error('Please record the reason the medication was refused.');
      return;
    }
    if (!guardOnline()) return;
    setIsSaving(true);
    try {
      await addMedicationLog({
        medicationId:    medication.id,
        patientId:       medication.patientId,
        date:            formData.date,
        time:            formData.time,
        scheduledTime:   scheduledTime ?? undefined,
        givenBy:         recordedAs,
        refused:         formData.refused,
        notes:           formData.notes.trim() || undefined,
        clientRequestId,
      });
      toast.success(formData.refused ? 'Refusal recorded.' : 'Administration logged.');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to log administration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header info */}
      <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-4 mb-2">
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{medication.name}</p>
        <p className="text-sm text-sky-600 dark:text-sky-400">
          {medication.patientName} · {medication.dosage}
          {scheduledTime ? ` · ${scheduledTime} dose` : ' · as needed'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={formData.date}
          onChange={(e) => setField('date', e.target.value)}
          required
        />
        <Input
          label="Time"
          type="time"
          value={formData.time}
          onChange={(e) => setField('time', e.target.value)}
          required
        />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Recorded as <span className="font-medium text-gray-800 dark:text-white">{recordedAs}</span>
      </p>

      <label className="flex items-center gap-3 cursor-pointer py-2">
        <input
          type="checkbox"
          checked={formData.refused}
          onChange={(e) => setField('refused', e.target.checked)}
          className="w-6 h-6 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resident refused medication</span>
      </label>

      <div>
        <label htmlFor="med-log-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {formData.refused ? <>Reason for refusal <span className="text-red-500">*</span></> : 'Notes'}
        </label>
        <textarea
          id="med-log-notes"
          value={formData.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={3}
          required={formData.refused}
          placeholder={formData.refused ? 'e.g. Said they felt nauseous; offered again at 13:30' : 'Optional notes…'}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : formData.refused ? 'Record Refusal' : 'Log Administration'}
        </Button>
      </div>
    </form>
  );
}
