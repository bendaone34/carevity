'use client';

import { Users, Calendar, ClipboardList, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/dashboard/StatsCard';
import { useUser } from '@/hooks/useUser';
import { useDashboardStats } from '@/hooks/useDashboardStats';

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-9 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-32 bg-gray-100 dark:bg-slate-700/50 rounded" />
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-xl shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-48 bg-gray-100 dark:bg-slate-700/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useUser();
  const name = user?.user_metadata?.full_name || user?.email || 'there';

  const {
    totalPatients, todayAppointments, pendingRecords, completedToday,
    trends, todayAppointmentsList, recentPatients, isLoading,
  } = useDashboardStats();

  const stats = [
    {
      title: 'Total Patients',
      value: totalPatients,
      icon: Users,
      color: 'blue' as const,
      trend: trends.totalPatients ?? undefined,
    },
    {
      title: "Today's Appointments",
      value: todayAppointments,
      icon: Calendar,
      color: 'green' as const,
      trend: trends.todayAppointments ?? undefined,
    },
    {
      title: 'Pending Records',
      value: pendingRecords,
      icon: ClipboardList,
      color: 'yellow' as const,
      // No trend — changes throughout the day as records are submitted
    },
    {
      title: 'Completed Today',
      value: completedToday,
      icon: CheckCircle,
      color: 'purple' as const,
      trend: trends.completedToday ?? undefined,
    },
  ];

  return (
    <div className="animate-fadeIn">
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${name}! Here's what's happening today.`}
      />

      {/* Stats Grid */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      )}

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Today's Appointments */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Today&apos;s Appointments</h3>
            <Link href="/appointments" className="text-sky-600 dark:text-sky-400 text-sm hover:underline">
              View all
            </Link>
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : todayAppointmentsList.length > 0 ? (
            <div className="space-y-3">
              {todayAppointmentsList.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{apt.patientName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{apt.time} · {apt.type}</p>
                  </div>
                  <span className={`ml-3 shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'completed'   ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    apt.status === 'in-progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                    apt.status === 'cancelled'   ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No appointments today</p>
          )}
        </div>

        {/* Recent Patients */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Patients</h3>
            <Link href="/patients" className="text-sky-600 dark:text-sky-400 text-sm hover:underline">
              View all
            </Link>
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : recentPatients.length > 0 ? (
            <div className="space-y-2">
              {recentPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white text-sm truncate">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{patient.email}</p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{patient.createdAt}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No patients yet</p>
          )}
        </div>

      </div>
    </div>
  );
}
