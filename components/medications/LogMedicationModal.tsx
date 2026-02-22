'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Medication } from '@/lib/types';
import { useUser } from '@/hooks/useUser';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface LogMedicationModalProps {
  medication: Medication;
  onClose: () => void;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LogMedicationModal({ medication, onClose }: LogMedicationModalProps) {
  const { addMedicationLog } = useStore();
  const user = useUser();
  const fullName = user?.user_metadata?.full_name || user?.email || '';

  const [formData, setFormData] = useState({
    date:    todayISO(),
    time:    nowTime(),
    givenBy: fullName,
    refused: false,
    notes:   '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const setField = (field: string, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addMedicationLog({
        medicationId: medication.id,
        patientId:    medication.patientId,
        date:         formData.date,
        time:         formData.time,
        givenBy:      formData.givenBy,
        refused:      formData.refused,
        notes:        formData.notes || undefined,
      });
      toast.success('Administration logged.');
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
        <p className="text-sm text-sky-600 dark:text-sky-400">{medication.patientName} · {medication.dosage}</p>
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

      <Input
        label="Given By"
        value={formData.givenBy}
        onChange={(e) => setField('givenBy', e.target.value)}
        placeholder="Staff member name"
        required
      />

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.refused}
          onChange={(e) => setField('refused', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Patient refused medication</span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={3}
          placeholder="Optional notes…"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Logging…' : 'Log Administration'}
        </Button>
      </div>
    </form>
  );
}
