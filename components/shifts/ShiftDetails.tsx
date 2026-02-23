'use client';

import { Shift } from '@/lib/types';
import Button from '@/components/ui/Button';

const SHIFT_BADGE = {
  morning:   'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  afternoon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  night:     'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
};

const SHIFT_LABELS = {
  morning:   'Morning 🌅',
  afternoon: 'Afternoon ☀️',
  night:     'Night 🌙',
};

interface ShiftDetailsProps {
  shift: Shift;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  canManage: boolean;
}

export default function ShiftDetails({ shift, onEdit, onDelete, onClose, canManage }: ShiftDetailsProps) {
  const dateDisplay = new Date(shift.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Date</p>
          <p className="font-medium text-gray-800 dark:text-white">{dateDisplay}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Time</p>
          <p className="font-medium text-gray-800 dark:text-white">{shift.startTime} – {shift.endTime}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Shift Type</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SHIFT_BADGE[shift.shiftType]}`}>
            {SHIFT_LABELS[shift.shiftType]}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Staff Member</p>
          <p className="font-medium text-gray-800 dark:text-white">{shift.staffName}</p>
        </div>
      </div>

      {/* Residents */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Residents Covered</p>
        {shift.residents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {shift.residents.map((r) => (
              <span key={r.patientId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                {r.patientName}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No residents assigned</p>
        )}
      </div>

      {/* Notes */}
      {shift.notes && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">{shift.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEdit}>Edit</Button>
            <Button variant="danger" onClick={onDelete}>Delete</Button>
          </div>
        )}
      </div>
    </div>
  );
}
