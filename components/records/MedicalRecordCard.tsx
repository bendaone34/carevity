import { MedicalRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import {
  FileText,
  User,
  Stethoscope,
  Pill,
  Activity,
  MoreVertical,
} from 'lucide-react';

interface MedicalRecordCardProps {
  record: MedicalRecord;
  onView?: () => void;
  onEdit?: () => void;
}

export default function MedicalRecordCard({ record, onView, onEdit }: MedicalRecordCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">{record.patientName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(record.date)}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Diagnosis */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Diagnosis
          </p>
          <p className="text-sm text-gray-800 dark:text-white font-medium">{record.diagnosis}</p>
        </div>

        {/* Treatment */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Treatment
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{record.treatment}</p>
        </div>

        {/* Prescriptions */}
        {record.prescriptions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Prescriptions
            </p>
            <div className="flex flex-wrap gap-2">
              {record.prescriptions.map((prescription, idx) => (
                <Badge key={idx} variant="blue">
                  <Pill className="w-3 h-3 mr-1" />
                  {prescription}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Vitals */}
        {record.vitals && (
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mt-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Vitals
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">BP:</span>{' '}
                <span className="font-medium dark:text-white">{record.vitals.bloodPressure}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">HR:</span>{' '}
                <span className="font-medium dark:text-white">{record.vitals.heartRate} bpm</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Temp:</span>{' '}
                <span className="font-medium dark:text-white">{record.vitals.temperature}°F</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Weight:</span>{' '}
                <span className="font-medium dark:text-white">{record.vitals.weight} lbs</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Stethoscope className="w-4 h-4" />
          <span>{record.doctorName}</span>
        </div>
        <button
          onClick={onView}
          className="text-sky-600 hover:text-sky-700 text-sm font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  );
}