import { Appointment } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Clock, User } from 'lucide-react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
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

export default function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Today&apos;s Appointments</h3>
        <Link
          href="/appointments"
          className="text-sky-600 hover:text-sky-700 text-sm font-medium flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="space-y-4">
        {appointments.slice(0, 5).map((appointment) => (
          <div
            key={appointment.id}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <div className="flex flex-col items-center justify-center w-16 h-16 bg-sky-50 rounded-xl">
              <Clock className="w-5 h-5 text-sky-600 mb-1" />
              <span className="text-sm font-semibold text-sky-700">
                {formatTime(appointment.time)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-gray-800 truncate">
                  {appointment.patientName}
                </p>
                <Badge variant={typeColors[appointment.type]}>
                  {appointment.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="w-4 h-4" />
                <span>{appointment.doctorName}</span>
              </div>
            </div>
            <Badge variant={statusColors[appointment.status]}>
              {appointment.status.replace('-', ' ')}
            </Badge>
          </div>
        ))}
        {appointments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No appointments scheduled for today
          </div>
        )}
      </div>
    </div>
  );
}