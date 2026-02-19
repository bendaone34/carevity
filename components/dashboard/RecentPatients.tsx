import Link from 'next/link';
import { Patient } from '@/lib/types';
import { getInitials, formatDate } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface RecentPatientsProps {
  patients: Patient[];
}

export default function RecentPatients({ patients }: RecentPatientsProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Recent Patients</h3>
        <Link
          href="/patients"
          className="text-sky-600 hover:text-sky-700 text-sm font-medium flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="space-y-4">
        {patients.slice(0, 5).map((patient) => (
          <Link
            key={patient.id}
            href={`/patients/${patient.id}`}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">
                {getInitials(patient.firstName, patient.lastName)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-sm text-gray-500 truncate">{patient.email}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-500">Added</p>
              <p className="text-sm font-medium text-gray-700">
                {formatDate(patient.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}