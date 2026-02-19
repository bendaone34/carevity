import { Appointment } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Clock, User, Stethoscope, MoreVertical } from 'lucide-react';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusColors: Record<Appointment['status'], 'blue' | 'green' | 'yellow' | 'red'> = {
  scheduled: 'blue',
  'in-progress': 'yellow',
  completed: 'green',
  cancelled: 'red',
};

const typeColors: Record<Appointment['type'], 'blue' | 'purple' | 'green' | 'red'> = {
  checkup: 'blue',
  consultation: 'purple',
  'follow-up': 'green',
  emergency: 'red',
};

export default function AppointmentCard({ appointment, onEdit, onDelete }: AppointmentCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex flex-col items-center justify-center">
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">
              {formatTime(appointment.time)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">{appointment.patientName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.date}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Stethoscope className="w-4 h-4 text-gray-400" />
          <span>{appointment.doctorName}</span>
        </div>
        {appointment.notes && (
          <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
            {appointment.notes}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
        <div className="flex gap-2">
          <Badge variant={typeColors[appointment.type]}>
            {appointment.type}
          </Badge>
          <Badge variant={statusColors[appointment.status]}>
            {appointment.status.replace('-', ' ')}
          </Badge>
        </div>
      </div>
    </div>
  );
}