'use client';

import { Users, Calendar, FileText, CheckCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/dashboard/StatsCard';
import { useStore } from '@/lib/store';
import { useUser } from '@/hooks/useUser';

export default function DashboardPage() {
  const { patients = [], appointments = [] } = useStore();
  const user = useUser();
  const name = user?.user_metadata?.full_name || user?.email || 'there';

  const today = new Date().toISOString().split('T')[0];
  
  // Safety checks with default empty arrays
  const todayAppointments = appointments?.filter((a) => a.date === today) || [];
  const completedToday = todayAppointments?.filter((a) => a.status === 'completed').length || 0;

  const stats = [
    {
      title: 'Total Patients',
      value: patients?.length || 0,
      icon: Users,
      color: 'blue' as const,
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Today's Appointments",
      value: todayAppointments?.length || 0,
      icon: Calendar,
      color: 'green' as const,
      trend: { value: 8, isPositive: true },
    },
    {
      title: 'Pending Records',
      value: 5,
      icon: FileText,
      color: 'yellow' as const,
      trend: { value: 3, isPositive: false },
    },
    {
      title: 'Completed Today',
      value: completedToday,
      icon: CheckCircle,
      color: 'purple' as const,
      trend: { value: 15, isPositive: true },
    },
  ];

  return (
    <div className="animate-fadeIn">
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${name}! Here's what's happening today.`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Appointments */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Today&apos;s Appointments</h3>
          {todayAppointments && todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{apt.patientName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{apt.time} - {apt.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    apt.status === 'in-progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                    'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No appointments today</p>
          )}
        </div>

        {/* Recent Patients */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Patients</h3>
          {patients && patients.length > 0 ? (
            <div className="space-y-3">
              {patients.slice(0, 5).map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{patient.firstName} {patient.lastName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{patient.email}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No patients yet</p>
          )}
        </div>
      </div>
    </div>
  );
}