'use client';

import { useState, useMemo } from 'react';
import { Bell, Eye, CheckCircle, XCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { useWellbeingAlerts } from '@/hooks/useWellbeingAlerts';
import { WellbeingAlert } from '@/lib/types';
import { SeverityBadge, AlertTypeBadge, ALERT_TYPE_LABELS } from '@/components/alerts/AlertBadge';
import AcknowledgeModal from '@/components/alerts/AcknowledgeModal';
import toast from 'react-hot-toast';

const STATUS_CLASSES = {
  open:         'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  acknowledged: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  resolved:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const STATUS_LABELS = {
  open:         'Open',
  acknowledged: 'Acknowledged',
  resolved:     'Resolved',
};

export default function AlertsPage() {
  const { resolveAlert, patients, currentUserRole } = useStore();
  const { activeAlerts, resolvedAlerts, acksForAlert, openHighCount, openMedCount, openLowCount } = useWellbeingAlerts();

  const isAdminOrManager = currentUserRole === 'admin' || currentUserRole === 'manager';

  const [tab,             setTab]             = useState<'active' | 'history'>('active');
  const [selectedAlert,   setSelectedAlert]   = useState<WellbeingAlert | null>(null);
  const [ackAlert,        setAckAlert]        = useState<WellbeingAlert | null>(null);
  const [resolvingId,     setResolvingId]     = useState<string | null>(null);

  // Filters
  const [filterPatient,  setFilterPatient]  = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  const selectCls = 'px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

  const displayAlerts = useMemo(() => {
    const base = tab === 'active' ? activeAlerts : resolvedAlerts;
    const sorted = [...base].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      return b.triggeredAt.localeCompare(a.triggeredAt);
    });
    return sorted.filter((a) => {
      if (filterPatient  && a.patientId  !== filterPatient)  return false;
      if (filterType     && a.alertType  !== filterType)     return false;
      if (filterSeverity && a.severity   !== filterSeverity) return false;
      return true;
    });
  }, [tab, activeAlerts, resolvedAlerts, filterPatient, filterType, filterSeverity]);

  async function handleResolve(alert: WellbeingAlert) {
    if (!confirm(`Mark this alert for ${alert.patientName} as resolved?`)) return;
    setResolvingId(alert.id);
    try {
      await resolveAlert(alert.id);
      toast.success('Alert resolved');
      if (selectedAlert?.id === alert.id) setSelectedAlert(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve');
    } finally {
      setResolvingId(null);
    }
  }

  if (!isAdminOrManager) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Bell className="w-14 h-14 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Wellbeing Alerts' }]} />
      <Header
        title="Wellbeing Alerts"
        subtitle="Automatically detected trends and declines across resident data"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'High', count: openHighCount, cls: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
          { label: 'Medium', count: openMedCount, cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
          { label: 'Low', count: openLowCount, cls: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
        ].map(({ label, count, cls, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${cls}`}>{count}</p>
            <p className={`text-sm font-medium ${cls} opacity-80`}>{label} severity open</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-700">
        {(['active', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'active' ? `Active (${activeAlerts.length})` : `History (${resolvedAlerts.length})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <select value={filterPatient} onChange={(e) => setFilterPatient(e.target.value)} className={selectCls}>
          <option value="">All residents</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectCls}>
          <option value="">All alert types</option>
          {Object.entries(ALERT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className={selectCls}>
          <option value="">All severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">
              {tab === 'active' ? 'No active alerts' : 'No resolved alerts'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {tab === 'active' ? 'Alerts are automatically generated when resident data breaches defined thresholds.' : 'Resolved alerts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Resident</th>
                  <th className="px-4 py-3 text-left">Alert</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Triggered</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {displayAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 ${
                      alert.severity === 'high' && alert.status === 'open' ? 'bg-red-50/50 dark:bg-red-900/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{alert.patientName}</td>
                    <td className="px-4 py-3"><AlertTypeBadge alertType={alert.alertType} /></td>
                    <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[alert.status]}`}>
                        {STATUS_LABELS[alert.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(alert.triggeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="p-1.5 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {alert.status === 'open' && (
                          <button
                            onClick={() => setAckAlert(alert)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                            title="Acknowledge"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {alert.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolve(alert)}
                            disabled={resolvingId === alert.id}
                            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                            title="Mark resolved"
                          >
                            <XCircle className="w-4 h-4" />
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

      {/* Detail modal */}
      <Modal isOpen={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Alert Details" size="md">
        {selectedAlert && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={selectedAlert.severity} />
              <AlertTypeBadge alertType={selectedAlert.alertType} />
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[selectedAlert.status]}`}>
                {STATUS_LABELS[selectedAlert.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Resident</p>
                <p className="font-medium text-gray-800 dark:text-white">{selectedAlert.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Triggered</p>
                <p className="font-medium text-gray-800 dark:text-white">
                  {new Date(selectedAlert.triggeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                {selectedAlert.message}
              </p>
            </div>

            {/* Acknowledgements */}
            {acksForAlert(selectedAlert.id).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Acknowledgements</p>
                <div className="space-y-2">
                  {acksForAlert(selectedAlert.id).map((ack) => (
                    <div key={ack.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
                      <p className="font-medium text-gray-800 dark:text-white">{ack.acknowledgedByName}</p>
                      {ack.notes      && <p className="text-gray-600 dark:text-gray-300 mt-0.5">{ack.notes}</p>}
                      {ack.actionTaken && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Action: {ack.actionTaken}</p>}
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{ack.createdAt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setSelectedAlert(null)}>Close</Button>
              {selectedAlert.status !== 'resolved' && (
                <div className="flex gap-2">
                  {selectedAlert.status === 'open' && (
                    <Button variant="secondary" onClick={() => { setAckAlert(selectedAlert); setSelectedAlert(null); }}>
                      Acknowledge
                    </Button>
                  )}
                  <Button variant="primary" onClick={() => { handleResolve(selectedAlert); }}>
                    Mark Resolved
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Acknowledge modal */}
      <Modal isOpen={!!ackAlert} onClose={() => setAckAlert(null)} title="Acknowledge Alert" size="md">
        {ackAlert && (
          <AcknowledgeModal alert={ackAlert} onClose={() => setAckAlert(null)} />
        )}
      </Modal>
    </div>
  );
}
