'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Medication } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { DEFAULT_DOSE_TIMES, parseDoseTimes } from '@/lib/emar';

interface MedicationFormProps {
  onClose: () => void;
  existing?: Medication;
}

const FREQUENCIES = [
  'once daily',
  'twice daily',
  'three times daily',
  'four times daily',
  'as needed',
  'weekly',
  'monthly',
];

const ROUTES = ['oral', 'topical', 'injection', 'inhaled', 'IV', 'sublingual', 'other'];

export default function MedicationForm({ onClose, existing }: MedicationFormProps) {
  const { patients, addMedication, updateMedication } = useStore();

  const [formData, setFormData] = useState({
    patientId:         existing?.patientId ?? '',
    name:              existing?.name ?? '',
    dosage:            existing?.dosage ?? '',
    frequency:         existing?.frequency ?? 'once daily',
    route:             existing?.route ?? 'oral',
    prescribingDoctor: existing?.prescribingDoctor ?? '',
    startDate:         existing?.startDate ?? '',
    endDate:           existing?.endDate ?? '',
    instructions:      existing?.instructions ?? '',
    status:            existing?.status ?? 'active' as Medication['status'],
    doseTimes:         (existing?.doseTimes?.length
                          ? existing.doseTimes
                          : DEFAULT_DOSE_TIMES[existing?.frequency ?? 'once daily'] ?? []).join(', '),
  });
  // Follow the frequency's standard times until the prescriber edits them
  const [doseTimesEdited, setDoseTimesEdited] = useState(!!existing?.doseTimes?.length);

  const [isSaving, setIsSaving] = useState(false);

  const setField = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const setFrequency = (frequency: string) =>
    setFormData((prev) => ({
      ...prev,
      frequency,
      doseTimes: doseTimesEdited ? prev.doseTimes : (DEFAULT_DOSE_TIMES[frequency] ?? []).join(', '),
    }));

  const isPrn = formData.frequency === 'as needed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.name || !formData.dosage || !formData.startDate) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const doseTimes = isPrn ? [] : parseDoseTimes(formData.doseTimes);
    if (doseTimes === null || (!isPrn && doseTimes.length === 0)) {
      toast.error('Enter dose times as 24-hour times, e.g. 08:00, 13:00, 18:00');
      return;
    }
    setIsSaving(true);
    try {
      if (existing) {
        await updateMedication(existing.id, {
          name:              formData.name,
          dosage:            formData.dosage,
          frequency:         formData.frequency,
          doseTimes,
          route:             formData.route,
          prescribingDoctor: formData.prescribingDoctor,
          startDate:         formData.startDate,
          endDate:           formData.endDate || undefined,
          instructions:      formData.instructions || undefined,
          status:            formData.status,
        });
        toast.success('Medication updated.');
      } else {
        await addMedication({
          patientId:         formData.patientId,
          name:              formData.name,
          dosage:            formData.dosage,
          frequency:         formData.frequency,
          doseTimes,
          route:             formData.route,
          prescribingDoctor: formData.prescribingDoctor,
          startDate:         formData.startDate,
          endDate:           formData.endDate || undefined,
          instructions:      formData.instructions || undefined,
          status:            formData.status,
        });
        toast.success('Medication added.');
      }
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save medication.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Patient <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.patientId}
          onChange={(e) => setField('patientId', e.target.value)}
          disabled={!!existing}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
        >
          <option value="">Select patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Medication Name *"
          value={formData.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="e.g. Lisinopril"
          required
        />
        <Input
          label="Dosage *"
          value={formData.dosage}
          onChange={(e) => setField('dosage', e.target.value)}
          placeholder="e.g. 10mg"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Frequency"
          value={formData.frequency}
          onChange={(e) => setFrequency(e.target.value)}
          options={FREQUENCIES.map((f) => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
        />
        <Select
          label="Route"
          value={formData.route}
          onChange={(e) => setField('route', e.target.value)}
          options={ROUTES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
        />
      </div>

      {!isPrn && (
        <Input
          label="Dose Times (24-hour) *"
          value={formData.doseTimes}
          onChange={(e) => {
            setDoseTimesEdited(true);
            setField('doseTimes', e.target.value);
          }}
          placeholder="e.g. 08:00, 13:00, 18:00"
          inputMode="numeric"
          required
        />
      )}

      <Input
        label="Prescribing Doctor"
        value={formData.prescribingDoctor}
        onChange={(e) => setField('prescribingDoctor', e.target.value)}
        placeholder="Dr. Smith"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Start Date *"
          type="date"
          value={formData.startDate}
          onChange={(e) => setField('startDate', e.target.value)}
          required
        />
        <Input
          label="End Date"
          type="date"
          value={formData.endDate}
          onChange={(e) => setField('endDate', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Instructions
        </label>
        <textarea
          value={formData.instructions}
          onChange={(e) => setField('instructions', e.target.value)}
          rows={3}
          placeholder="Optional administration instructions…"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      {existing && (
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setField('status', e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'discontinued', label: 'Discontinued' },
          ]}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : existing ? 'Update Medication' : 'Add Medication'}
        </Button>
      </div>
    </form>
  );
}
