'use client';

import { useStore } from '@/lib/store';
import { useReportData } from '@/hooks/useReportData';
import StatsCard from '@/components/dashboard/StatsCard';
import {
  Users,
  ClipboardList,
  BookOpen,
  UserCheck,
  Download,
  Printer,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Access denied card ───────────────────────────────────────────────────────

function AccessDeniedCard() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Reports & Analytics is only available to admins and managers.
        </p>
      </div>
    </div>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(report: ReturnType<typeof useReportData>, dateStr: string) {
  const lines: string[] = [];

  lines.push('At-Risk Patients');
  lines.push('Patient Name,Last Record Date,Hours Since Last Record,Status');
  for (const p of report.atRiskPatients) {
    const hours = p.hoursAgo !== null ? String(p.hoursAgo) : 'Never recorded';
    const status = p.lastRecordDate === null ? 'Never recorded' : 'Overdue';
    lines.push(`"${p.name}","${p.lastRecordDate ?? ''}","${hours}","${status}"`);
  }

  lines.push('');
  lines.push('Overdue Tasks');
  lines.push('Task Title,Status,Due Date,Days Overdue,Patient,Care Plan');
  for (const t of report.overdueTasksWithPlans) {
    lines.push(
      `"${t.taskTitle}","${t.taskStatus}","${t.dueDate}","${t.daysOverdue}","${t.patientName}","${t.carePlanTitle}"`
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `carevity-report-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const currentUserRole = useStore((s) => s.currentUserRole);
  const report = useReportData();

  // Must be after all hook calls per React rules
  if (currentUserRole === 'carer') return <AccessDeniedCard />;

  const todayStr = new Date().toISOString().split('T')[0];

  const isDark =
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  const tooltipStyle = isDark
    ? {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        color: '#f1f5f9',
      }
    : {
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        color: '#1f2937',
      };

  return (
    <div className="animate-fadeIn" id="report-content">

      {/* ── Header (hidden when printing) ──────────────────────────────────── */}
      <div className="print:hidden">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reports &amp; Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Generated {report.generatedAt}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportCSV(report, todayStr)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Print-only title ───────────────────────────────────────────────── */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carevity — Reports &amp; Analytics</h1>
        <p className="text-gray-600 mt-1">Generated {report.generatedAt}</p>
        <hr className="mt-3 border-gray-300" />
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Patients"      value={report.totalPatients}    icon={Users}         color="blue"   />
        <StatsCard title="Active Care Plans"   value={report.activeCarePlans}  icon={ClipboardList} color="green"  />
        <StatsCard title="Records This Week"   value={report.recordsThisWeek}  icon={BookOpen}      color="yellow" />
        <StatsCard title="Staff on Duty Today" value={report.staffOnDutyToday} icon={UserCheck}     color="purple" />
      </div>

      {/* ── Charts 2×2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Chart 1 — Daily record volume (last 14 days) */}
        <ChartCard title="Daily Record Volume (last 14 days)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.dailyRecordVolume} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Records" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2 — Patient coverage rate (last 30 days) */}
        <ChartCard title="Patient Coverage Rate % (last 30 days)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={report.completionRate} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Coverage']} />
              <Line type="monotone" dataKey="rate" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Coverage %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3 — Average mood score (last 30 days) */}
        <ChartCard title="Average Mood Score (last 30 days, 1–5)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={report.avgMoodByDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }} domain={[0, 5]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Avg mood']} />
              <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} dot={false} name="Avg Mood" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4 — Records by carer */}
        <ChartCard title="Records by Carer (top 10)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              layout="vertical"
              data={report.recordsByCarer}
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="carer"
                width={90}
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Records" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* ── At-risk patients table ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">At-Risk Patients</h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            {report.atRiskPatients.length}
          </span>
        </div>
        {report.atRiskPatients.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">
            All patients have been recorded in the last 48 hours.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Last Record</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Time Since</th>
                </tr>
              </thead>
              <tbody>
                {report.atRiskPatients.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-white">{p.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {p.lastRecordDate ?? <span className="italic text-gray-400">Never</span>}
                    </td>
                    <td className="py-3 px-4">
                      {p.hoursAgo === null ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                          <Clock className="w-3 h-3" /> Never recorded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          <Clock className="w-3 h-3" /> {p.hoursAgo}h ago
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Overdue tasks table ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">Overdue Care Plan Tasks</h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            {report.overdueTasksWithPlans.length}
          </span>
        </div>
        {report.overdueTasksWithPlans.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">
            No overdue care plan tasks.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Task</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Care Plan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Due Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Overdue</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.overdueTasksWithPlans.map((t) => (
                  <tr key={t.taskId} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-white">{t.taskTitle}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{t.patientName}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{t.carePlanTitle}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{t.dueDate}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        {t.daysOverdue}d
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        t.taskStatus === 'in_progress'
                          ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {t.taskStatus === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </td>
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
