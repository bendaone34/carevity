'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Medication } from '@/lib/types';
import MedicationForm from './MedicationForm';
import { Edit } from 'lucide-react';

interface MedicationDetailsProps {
  medication: Medication;
  onClose: () => void;
}

export default function MedicationDetails({ medication, onClose }: MedicationDetailsProps) {
  const { medicationLogs, currentUserRole } = useStore();
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = currentUserRole === 'admin' || currentUserRole === 'manager';

  const logs = medicationLogs
    .filter((l) => l.medicationId === medication.id)
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });

  if (isEditing) {
    return (
      <MedicationForm
        existing={medication}
        onClose={() => { setIsEditing(false); onClose(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Details */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">Details</h3>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Patient</p>
            <p className="font-medium text-gray-800 dark:text-white">{medication.patientName}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Status</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              medication.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
            }`}>
              {medication.status === 'active' ? 'Active' : 'Discontinued'}
            </span>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Dosage</p>
            <p className="font-medium text-gray-800 dark:text-white">{medication.dosage}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Frequency</p>
            <p className="font-medium text-gray-800 dark:text-white capitalize">{medication.frequency}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Route</p>
            <p className="font-medium text-gray-800 dark:text-white capitalize">{medication.route}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Prescribing Doctor</p>
            <p className="font-medium text-gray-800 dark:text-white">{medication.prescribingDoctor || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Start Date</p>
            <p className="font-medium text-gray-800 dark:text-white">{medication.startDate}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">End Date</p>
            <p className="font-medium text-gray-800 dark:text-white">{medication.endDate ?? 'No end date'}</p>
          </div>
          {medication.instructions && (
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Instructions</p>
              <p className="font-medium text-gray-800 dark:text-white">{medication.instructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Administration Log */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Administration Log</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No administrations logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Given By</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 px-3 text-gray-800 dark:text-white">{log.date}</td>
                    <td className="py-2 px-3 text-gray-800 dark:text-white">{log.time}</td>
                    <td className="py-2 px-3 text-gray-800 dark:text-white">{log.givenBy}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.refused
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {log.refused ? 'Refused' : 'Given'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{log.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
