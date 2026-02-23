'use client';

import { Users, Calendar, ClipboardList, CheckCircle, AlertTriangle, Bell } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/dashboard/StatsCard';
import { useUser } from '@/hooks/useUser';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useStore } from '@/lib/store';
import { useWellbeingAlerts } from '@/hooks/useWellbeingAlerts';

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {[...Array(5)].map((_, i) => (
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

  const medications    = useStore((s) => s.medications);
  const medicationLogs = useStore((s) => s.medicationLogs);
  const incidents      = useStore((s) => s.incidents);
  const shifts         = useStore((s) => s.shifts);
  const openCriticalIncidents = incidents.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved'
  );
  const currentUserRole = useStore((s) => s.currentUserRole);
  const isAdminOrManager = currentUserRole === 'admin' || currentUserRole === 'manager';
  const todayISO = new Date().toISOString().split('T')[0];
  const loggedTodayIds = new Set(
    medicationLogs.filter((l) => l.date === todayISO && !l.refused).map((l) => l.medicationId)
  );
  const unloggedToday = medications.filter((m) => m.status === 'active' && !loggedTodayIds.has(m.id));

  const todayShifts = shifts.filter((s) => s.date === todayISO);
  const { openHighCount, openMedCount, openLowCount, openTotalCount } = useWellbeingAlerts();
  const highAlerts = useStore((s) => s.wellbeingAlerts.filter((a) => a.severity === 'high' && a.status === 'open'));

  const myNextShift = [...shifts]
    .filter((s) => s.staffId === user?.id && s.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0];

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
    ...(isAdminOrManager ? [{
      title: 'Open Alerts',
      value: openTotalCount,
      icon: Bell,
      color: 'yellow' as const,
    }] : []),
  ];

  return (
    <div className="animate-fadeIn">
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${name}! Here's what's happening today.`}
      />

      {/* High severity wellbeing alert banner */}
      {isAdminOrManager && highAlerts.length > 0 && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <Bell className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {highAlerts.length} high severity wellbeing alert{highAlerts.length > 1 ? 's' : ''} require attention
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {highAlerts.slice(0, 2).map((a) => a.patientName).join(', ')}
              {highAlerts.length > 2 ? ` +${highAlerts.length - 2} more` : ''}
            </p>
          </div>
          <Link href="/alerts" className="text-xs font-medium text-red-700 dark:text-red-300 hover:underline shrink-0">
            View alerts →
          </Link>
        </div>
      )}

      {/* Critical incident banner */}
      {openCriticalIncidents.length > 0 && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {openCriticalIncidents.length} critical incident{openCriticalIncidents.length > 1 ? 's' : ''} require attention
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {openCriticalIncidents.slice(0, 2).map((i) => i.patientName).join(', ')}
              {openCriticalIncidents.length > 2 ? ` +${openCriticalIncidents.length - 2} more` : ''}
            </p>
          </div>
          <Link href="/incidents" className="text-xs font-medium text-red-700 dark:text-red-300 hover:underline shrink-0">
            View →
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${isAdminOrManager ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      )}

      {/* Bottom panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">

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

        {/* Shifts Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {isAdminOrManager ? "Today's Shifts" : 'My Next Shift'}
            </h3>
            <Link href="/shifts" className="text-sky-600 dark:text-sky-400 text-sm hover:underline">
              {isAdminOrManager ? 'View rota →' : 'View schedule →'}
            </Link>
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : isAdminOrManager ? (
            todayShifts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No shifts scheduled today</p>
            ) : (
              <div className="space-y-2">
                {todayShifts.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{s.staffName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.startTime}–{s.endTime}</p>
                    </div>
                    <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.shiftType === 'morning'   ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' :
                      s.shiftType === 'afternoon' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    }`}>
                      {s.shiftType}
                    </span>
                  </div>
                ))}
                {todayShifts.length > 4 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                    +{todayShifts.length - 4} more
                  </p>
                )}
              </div>
            )
          ) : myNextShift ? (
            <div className="space-y-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                myNextShift.shiftType === 'morning'   ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' :
                myNextShift.shiftType === 'afternoon' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
              }`}>
                {myNextShift.shiftType === 'morning' ? 'Morning 🌅' : myNextShift.shiftType === 'afternoon' ? 'Afternoon ☀️' : 'Night 🌙'}
              </span>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {new Date(myNextShift.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{myNextShift.startTime} – {myNextShift.endTime}</p>
              {myNextShift.residents.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{myNextShift.residents.length} resident{myNextShift.residents.length !== 1 ? 's' : ''} assigned</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No upcoming shifts</p>
          )}
        </div>

        {/* Wellbeing Alerts */}
        {isAdminOrManager && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Wellbeing Alerts</h3>
              <Link href="/alerts" className="text-sky-600 dark:text-sky-400 text-sm hover:underline">View all →</Link>
            </div>
            {isLoading ? (
              <ListSkeleton />
            ) : openTotalCount === 0 ? (
              <p className="text-green-600 dark:text-green-400 text-sm font-medium text-center py-8">No open alerts</p>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'High',   count: openHighCount, cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
                  { label: 'Medium', count: openMedCount,  cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
                  { label: 'Low',    count: openLowCount,  cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
                ].filter(({ count }) => count > 0).map(({ label, count, cls }) => (
                  <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${cls}`}>
                    <span className="text-sm font-medium">{label} severity</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Medication Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Medication Alerts</h3>
            <Link href="/medications" className="text-sky-600 dark:text-sky-400 text-sm hover:underline">
              View schedule
            </Link>
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : unloggedToday.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">All medications logged today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unloggedToday.slice(0, 5).map((med) => (
                <div key={med.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{med.patientName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{med.name} · {med.dosage}</p>
                  </div>
                </div>
              ))}
              {unloggedToday.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                  +{unloggedToday.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
