'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '@/lib/store';
import { Shift } from '@/lib/types';
import { guardOnline } from '@/lib/offline';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

const SHIFT_DEFAULTS: Record<Shift['shiftType'], { startTime: string; endTime: string }> = {
  morning:   { startTime: '07:00', endTime: '15:00' },
  afternoon: { startTime: '14:00', endTime: '22:00' },
  night:     { startTime: '21:00', endTime: '07:00' },
};

interface ShiftFormProps {
  shift?: Shift;
  defaultDate?: string;
  onClose: () => void;
}

export default function ShiftForm({ shift, defaultDate, onClose }: ShiftFormProps) {
  const { staffMembers, patients, addShift, updateShift } = useStore();

  const [staffId, setStaffId]       = useState(shift?.staffId ?? '');
  const [date, setDate]             = useState(shift?.date ?? defaultDate ?? '');
  const [shiftType, setShiftType]   = useState<Shift['shiftType']>(shift?.shiftType ?? 'morning');
  const [startTime, setStartTime]   = useState(shift?.startTime ?? SHIFT_DEFAULTS.morning.startTime);
  const [endTime, setEndTime]       = useState(shift?.endTime ?? SHIFT_DEFAULTS.morning.endTime);
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(
    new Set(shift?.residents.map((r) => r.patientId) ?? [])
  );
  const [notes, setNotes]   = useState(shift?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const staffOptions = staffMembers.map((s) => ({
    value: s.id,
    label: `${s.fullName} (${s.role})`,
  }));

  const shiftTypeOptions = [
    { value: 'morning',   label: 'Morning 🌅' },
    { value: 'afternoon', label: 'Afternoon ☀️' },
    { value: 'night',     label: 'Night 🌙' },
  ];

  function handleShiftTypeChange(value: string) {
    const t = value as Shift['shiftType'];
    setShiftType(t);
    setStartTime(SHIFT_DEFAULTS[t].startTime);
    setEndTime(SHIFT_DEFAULTS[t].endTime);
  }

  function toggleResident(patientId: string) {
    setSelectedResidents((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!staffId) errs.staffId = 'Please select a staff member.';
    if (!date)    errs.date    = 'Please select a date.';
    if (startTime >= endTime && shiftType !== 'night') {
      errs.time = 'Start time must be before end time.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guardOnline()) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        staffId, date, startTime, endTime, shiftType, notes: notes || undefined,
        residentIds: Array.from(selectedResidents),
      };
      if (shift) {
        await updateShift(shift.id, payload);
        toast.success('Shift updated');
      } else {
        await addShift(payload);
        toast.success('Shift created');
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Carer */}
        <div className="sm:col-span-2">
          <Select
            label="Carer"
            value={staffId}
            options={[{ value: '', label: 'Select staff member…' }, ...staffOptions]}
            onChange={(e) => setStaffId(e.target.value)}
            error={errors.staffId}
          />
        </div>

        {/* Date */}
        <div>
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
        </div>

        {/* Shift Type */}
        <div>
          <Select
            label="Shift Type"
            value={shiftType}
            options={shiftTypeOptions}
            onChange={(e) => handleShiftTypeChange(e.target.value)}
          />
        </div>

        {/* Start Time */}
        <div>
          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            error={errors.time}
          />
        </div>

        {/* End Time */}
        <div>
          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {/* Residents */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Residents (optional)
        </label>
        <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-y-auto max-h-48 divide-y divide-gray-100 dark:divide-slate-700">
          {patients.length === 0 ? (
            <p className="text-sm text-gray-400 p-3">No residents found</p>
          ) : (
            patients.map((p) => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedResidents.has(p.id)}
                  onChange={() => toggleResident(p.id)}
                  className="rounded border-gray-300 dark:border-slate-600 text-sky-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {p.firstName} {p.lastName}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (optional)
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any shift-specific notes…"
          className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving…' : shift ? 'Update Shift' : 'Create Shift'}
        </Button>
      </div>
    </form>
  );
}
