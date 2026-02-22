'use client';

import { Medication } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
  onClick: () => void;
  onDelete?: () => void;
}

export default function MedicationCard({ medication, onClick, onDelete }: MedicationCardProps) {
  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5 cursor-pointer hover:shadow-md hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-200 relative"
    >
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
          title="Delete medication"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      )}

      <div className="flex items-start justify-between gap-2 mb-2 pr-6">
        <h3 className="font-semibold text-gray-800 dark:text-white text-base leading-tight">{medication.name}</h3>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
          medication.status === 'active'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
        }`}>
          {medication.status === 'active' ? 'Active' : 'Discontinued'}
        </span>
      </div>

      <p className="text-sm text-sky-600 dark:text-sky-400 font-medium mb-3">{medication.patientName}</p>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {medication.dosage} · {medication.frequency} · {medication.route}
      </p>

      {medication.prescribingDoctor && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Dr. {medication.prescribingDoctor}
        </p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {medication.startDate} → {medication.endDate ?? 'No end date'}
      </p>
    </div>
  );
}
