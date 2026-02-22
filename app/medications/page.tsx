'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useUser } from '@/hooks/useUser';
import { Medication } from '@/lib/types';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import MedicationForm from '@/components/medications/MedicationForm';
import MedicationCard from '@/components/medications/MedicationCard';
import MedicationDetails from '@/components/medications/MedicationDetails';
import LogMedicationModal from '@/components/medications/LogMedicationModal';
import { Plus, Search, Pill, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

type ScheduleStatus = 'given' | 'refused' | 'as-needed' | 'due' | 'overdue';

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  given:      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  refused:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  'as-needed':'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400',
  due:        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  overdue:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  given:      'Given',
  refused:    'Refused',
  'as-needed':'As Needed',
  due:        'Due',
  overdue:    'Overdue',
};

export default function MedicationsPage() {
  const {
    medications, medicationLogs, patients, staffMembers,
    currentUserRole, deleteMedication,
  } = useStore();
  const user = useUser();

  const [tab, setTab] = useState<'schedule' | 'medications' | 'log'>('schedule');

  // Medications tab state
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'discontinued'>('all');
  const [search, setSearch] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsMed, setDetailsMed] = useState<Medication | null>(null);

  // Schedule tab state
  const [logMed, setLogMed] = useState<Medication | null>(null);

  // Log tab state
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logPatientFilter, setLogPatientFilter] = useState('');

  const isAdminOrManager = currentUserRole === 'admin' || currentUserRole === 'manager';
  const isAdmin = currentUserRole === 'admin';

  // ── Role-aware patient scope ─────────────────────────────────────────────────
  const userId = user?.id ?? null;
  const assignedIds: string[] | null =
    currentUserRole === 'carer' && userId !== null
      ? (staffMembers.find((s) => s.id === userId)?.assignedPatientIds ?? [])
      : null;

  // ── Schedule computation ─────────────────────────────────────────────────────
  const todayISO = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  const scheduleData = useMemo(() => {
    const activeMeds = medications.filter((m) => {
      if (m.status !== 'active') return false;
      if (assignedIds !== null && !assignedIds.includes(m.patientId)) return false;
      return true;
    });

    const todayLogs = medicationLogs.filter((l) => l.date === todayISO);

    const medWithStatus = activeMeds.map((med) => {
      const log = todayLogs.find((l) => l.medicationId === med.id);
      let status: ScheduleStatus;
      if (log && !log.refused) status = 'given';
      else if (log && log.refused) status = 'refused';
      else if (!log && med.frequency === 'as needed') status = 'as-needed';
      else if (!log && hour < 18) status = 'due';
      else status = 'overdue';
      return { med, status };
    });

    // Group by patient
    const byPatient = new Map<string, { patientName: string; items: typeof medWithStatus }>();
    for (const item of medWithStatus) {
      const existing = byPatient.get(item.med.patientId);
      if (existing) {
        existing.items.push(item);
      } else {
        byPatient.set(item.med.patientId, { patientName: item.med.patientName, items: [item] });
      }
    }
    return Array.from(byPatient.values());
  }, [medications, medicationLogs, todayISO, hour, assignedIds]);

  // ── Medications tab filtering ─────────────────────────────────────────────────
  const filteredMeds = useMemo(() => {
    return medications.filter((m) => {
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      if (patientFilter && m.patientId !== patientFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.patientName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [medications, filterStatus, patientFilter, search]);

  const activeMedCount = medications.filter((m) => m.status === 'active').length;
  const discontinuedCount = medications.filter((m) => m.status === 'discontinued').length;

  // ── Log tab filtering ─────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return medicationLogs.filter((l) => {
      if (logDate && l.date !== logDate) return false;
      if (logPatientFilter && l.patientId !== logPatientFilter) return false;
      return true;
    });
  }, [medicationLogs, logDate, logPatientFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this medication and all its administration logs?')) return;
    try {
      await deleteMedication(id);
      toast.success('Medication deleted.');
    } catch {
      toast.error('Failed to delete medication.');
    }
  };

  const tabs = [
    { id: 'schedule' as const, label: 'Schedule' },
    { id: 'medications' as const, label: 'Medications' },
    { id: 'log' as const, label: 'Log' },
  ];

  return (
    <div className="animate-fadeIn">
      <Header title="Medications" subtitle="Manage medication profiles and track daily administrations." />

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.id
                ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: SCHEDULE ───────────────────────────────────────────────────────── */}
      {tab === 'schedule' && (
        <div className="space-y-6">
          {scheduleData.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">No medications scheduled</h3>
              <p className="text-gray-500 dark:text-gray-400">No active medications found for your patients.</p>
            </div>
          ) : (
            scheduleData.map(({ patientName, items }) => (
              <div key={patientName} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{patientName}</h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {items.map(({ med, status }) => (
                    <div key={med.id} className="flex items-center justify-between px-5 py-3 gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white text-sm">{med.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {med.dosage} · {med.frequency} · {med.route}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                        {status !== 'given' && (
                          <button
                            onClick={() => setLogMed(med)}
                            className="px-3 py-1.5 text-xs font-medium bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                          >
                            Log
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: MEDICATIONS ────────────────────────────────────────────────────── */}
      {tab === 'medications' && (
        <div>
          {/* Controls row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            {/* Status filter pills */}
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 text-sm">
              {(['all', 'active', 'discontinued'] as const).map((s) => {
                const count = s === 'all' ? medications.length : s === 'active' ? activeMedCount : discontinuedCount;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      filterStatus === s
                        ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medications…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Patient filter */}
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>

            {/* Add button */}
            {isAdminOrManager && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors ml-auto"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </button>
            )}
          </div>

          {/* Grid */}
          {filteredMeds.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">No medications found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-5">
                {medications.length === 0 ? 'Add the first medication to get started.' : 'Try adjusting your search or filters.'}
              </p>
              {medications.length === 0 && isAdminOrManager && (
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
                >
                  Add medication
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMeds.map((med) => (
                <MedicationCard
                  key={med.id}
                  medication={med}
                  onClick={() => setDetailsMed(med)}
                  onDelete={isAdmin ? () => handleDelete(med.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: LOG ────────────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <select
              value={logPatientFilter}
              onChange={(e) => setLogPatientFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No administration logs found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Medication</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Patient</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Given By</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Notes</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 text-gray-800 dark:text-white">{log.date}</td>
                        <td className="py-3 px-4 text-gray-800 dark:text-white">{log.time}</td>
                        <td className="py-3 px-4 text-gray-800 dark:text-white font-medium">{log.medicationName}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{log.patientName}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{log.givenBy}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{log.notes ?? '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.refused
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          }`}>
                            {log.refused ? 'Refused' : 'Given'}
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
      )}

      {/* Modals */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Medication" size="lg">
        <MedicationForm onClose={() => setAddModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={detailsMed !== null}
        onClose={() => setDetailsMed(null)}
        title={detailsMed?.name ?? ''}
        size="lg"
      >
        {detailsMed && (
          <MedicationDetails medication={detailsMed} onClose={() => setDetailsMed(null)} />
        )}
      </Modal>

      <Modal
        isOpen={logMed !== null}
        onClose={() => setLogMed(null)}
        title="Log Administration"
        size="md"
      >
        {logMed && (
          <LogMedicationModal medication={logMed} onClose={() => setLogMed(null)} />
        )}
      </Modal>
    </div>
  );
}
