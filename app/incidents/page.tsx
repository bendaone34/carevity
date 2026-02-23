'use client';

import { useState, useMemo } from 'react';
import { Plus, Eye, Trash2, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { useStore } from '@/lib/store';
import { useUser } from '@/hooks/useUser';
import { Incident } from '@/lib/types';
import IncidentForm from '@/components/incidents/IncidentForm';
import IncidentDetails from '@/components/incidents/IncidentDetails';

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const SEVERITY_CLASSES: Record<Incident['severity'], string> = {
  low:      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  medium:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  high:     'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_CLASSES: Record<Incident['status'], string> = {
  open:         'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  under_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  resolved:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const STATUS_LABELS: Record<Incident['status'], string> = {
  open:         'Open',
  under_review: 'Under Review',
  resolved:     'Resolved',
};

const TYPE_LABELS: Record<Incident['incidentType'], string> = {
  fall:             'Fall',
  medication_error: 'Medication Error',
  safeguarding:     'Safeguarding',
  behavioural:      'Behavioural',
  accident:         'Accident',
  near_miss:        'Near Miss',
  other:            'Other',
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function IncidentsPage() {
  const user = useUser();
  const { incidents, deleteIncident, currentUserRole, patients } = useStore((s) => ({
    incidents:       s.incidents,
    deleteIncident:  s.deleteIncident,
    currentUserRole: s.currentUserRole,
    patients:        s.patients,
  }));

  const isManager = currentUserRole === 'admin' || currentUserRole === 'manager';
  const isAdmin   = currentUserRole === 'admin';

  const [tab,             setTab]             = useState<'log' | 'manage'>('log');
  const [showForm,        setShowForm]        = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filters (manage tab)
  const [filterFrom,     setFilterFrom]     = useState('');
  const [filterTo,       setFilterTo]       = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterPatient,  setFilterPatient]  = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');

  // Log tab incidents
  const logIncidents = useMemo(() => {
    if (isManager) return incidents;
    return incidents.filter((i) => i.reportedById === user?.id);
  }, [incidents, isManager, user]);

  // Manage tab incidents (with filters)
  const managedIncidents = useMemo(() => {
    return incidents.filter((i) => {
      if (filterFrom     && i.date < filterFrom)        return false;
      if (filterTo       && i.date > filterTo)          return false;
      if (filterSeverity && i.severity !== filterSeverity) return false;
      if (filterType     && i.incidentType !== filterType) return false;
      if (filterPatient  && i.patientId !== filterPatient) return false;
      if (filterStatus   && i.status !== filterStatus)  return false;
      return true;
    });
  }, [incidents, filterFrom, filterTo, filterSeverity, filterType, filterPatient, filterStatus]);

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this incident report? This cannot be undone.')) return;
    deleteIncident(id).catch(() => {});
  };

  const selectCls = 'px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

  return (
    <div className="animate-fadeIn">
      <Header
        title="Incidents"
        subtitle="Log and manage incident reports"
      />

      {/* Tab bar — hidden for carers */}
      {isManager && (
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-700">
          {(['log', 'manage'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'log' ? 'Log' : 'Manage'}
            </button>
          ))}
        </div>
      )}

      {/* ── LOG TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Report New Incident
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            {logIncidents.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">No incidents reported</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-5">Report an incident to begin tracking.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
                >
                  Report incident
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {logIncidents.map((inc) => (
                    <tr key={inc.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 ${inc.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inc.date}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inc.time}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{inc.patientName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{TYPE_LABELS[inc.incidentType]}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${SEVERITY_CLASSES[inc.severity]}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[inc.status]}`}>
                          {STATUS_LABELS[inc.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="p-1.5 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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

      {/* ── MANAGE TAB ──────────────────────────────────────────────────────── */}
      {tab === 'manage' && isManager && (
        <div>
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className={selectCls}
              title="From date"
            />
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className={selectCls}
              title="To date"
            />
            <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className={selectCls}>
              <option value="">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectCls}>
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select value={filterPatient} onChange={(e) => setFilterPatient(e.target.value)} className={selectCls}>
              <option value="">All patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            {managedIncidents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No incidents match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Reported By</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {managedIncidents.map((inc) => (
                    <tr key={inc.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 ${inc.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inc.date}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inc.time}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{inc.patientName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{TYPE_LABELS[inc.incidentType]}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${SEVERITY_CLASSES[inc.severity]}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[inc.status]}`}>
                          {STATUS_LABELS[inc.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{inc.reportedBy}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedIncident(inc)}
                            className="p-1.5 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(inc.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              title="Delete incident"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

      {/* Report form modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Report New Incident"
        size="lg"
      >
        <IncidentForm onClose={() => setShowForm(false)} />
      </Modal>

      {/* Incident details modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Report"
        size="xl"
      >
        {selectedIncident && (
          <IncidentDetails
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        )}
      </Modal>
    </div>
  );
}
