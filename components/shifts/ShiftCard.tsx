'use client';

import { Shift } from '@/lib/types';

const SHIFT_COLOURS = {
  morning:   'bg-sky-100 dark:bg-sky-900/40 border-l-4 border-sky-400',
  afternoon: 'bg-amber-100 dark:bg-amber-900/40 border-l-4 border-amber-400',
  night:     'bg-purple-100 dark:bg-purple-900/40 border-l-4 border-purple-400',
};

const SHIFT_LABELS = {
  morning:   'Morning 🌅',
  afternoon: 'Afternoon ☀️',
  night:     'Night 🌙',
};

interface ShiftCardProps {
  shift: Shift;
  compact?: boolean;
  onClick?: () => void;
}

export default function ShiftCard({ shift, compact = false, onClick }: ShiftCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:opacity-90 transition-opacity ${SHIFT_COLOURS[shift.shiftType]} ${compact ? '' : 'px-3 py-2'}`}
    >
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
          {SHIFT_LABELS[shift.shiftType]}
        </span>
        {shift.residents.length > 0 && (
          <span className="shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/60 dark:bg-black/20 text-gray-700 dark:text-gray-200">
            {shift.residents.length} resident{shift.residents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {!compact && (
        <p className="mt-0.5 text-gray-600 dark:text-gray-300 truncate">{shift.staffName}</p>
      )}
      <p className="text-gray-600 dark:text-gray-300 mt-0.5">
        {shift.startTime} – {shift.endTime}
      </p>
    </div>
  );
}
