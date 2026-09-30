'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollText, ShieldCheck, ChevronDown, ChevronRight, Download } from 'lucide-react';
import Header from '@/components/layout/Header';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { useStore } from '@/lib/store';
import { useRole } from '@/hooks/useRole';
import { createClient } from '@/lib/supabase/client';
import {
  AUDIT_RECORD_LABELS, mapAuditRow, describeAuditEntry, formatAuditValue, type AuditEntry,
} from '@/lib/audit';
import { CARE_HOME_TZ, londonDate, londonDayStartISO } from '@/lib/emar';
import toast from 'react-hot-toast';

const PAGE_SIZE = 200;

const ACTION_STYLES: Record<AuditEntry['action'], string> = {
  INSERT: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  UPDATE: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};
const ACTION_LABELS: Record<AuditEntry['action'], string> = {
  INSERT: 'Created', UPDATE: 'Edited', DELETE: 'Deleted',
};

const whenFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: CARE_HOME_TZ, day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default function AuditPage() {
  const { patients, clinicId } = useStore();
  const { isAdminOrManager } = useRole();

  const [patientId, setPatientId] = useState('');
  const [table, setTable] = useState('');
  const [from, setFrom] = useState(() => londonDate(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => londonDate(new Date()));

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [isVerifying, setIsVerifying] = useState(false);

  const patientNames = useMemo(
    () => new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`])),
    [patients],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    let query = createClient()
      .from('audit_log')
      .select('id, at, action, table_name, row_id, patient_id, actor_id, actor_name, old_data, new_data, changed_fields')
      .order('at', { ascending: false })
      .limit(PAGE_SIZE);
    if (patientId) query = query.eq('patient_id', patientId);
    if (table)     query = query.eq('table_name', table);
    if (from)      query = query.gte('at', londonDayStartISO(from));
    if (to)        query = query.lt('at', londonDayStartISO(nextDay(to)));

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load the audit trail.');
    } else {
      setEntries((data ?? []).map(mapAuditRow));
    }
    setIsLoading(false);
  }, [patientId, table, from, to]);

  useEffect(() => {
    if (isAdminOrManager) load();
  }, [isAdminOrManager, load]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const verify = async () => {
    if (!clinicId) return;
    setIsVerifying(true);
    const { data, error } = await createClient().rpc('verify_audit_chain', { p_clinic_id: clinicId });
    setIsVerifying(false);
    if (error) {
      toast.error('Integrity check could not run.');
    } else if (data === null) {
      toast.success('Integrity check passed: no entries have been altered or removed.');
    } else {
      toast.error(`Integrity check FAILED at entry #${data}. Entries from this point may have been altered.`, { duration: 10_000 });
    }
  };

  const exportCsv = () => {
    const header = ['When (UK time)', 'Who', 'Action', 'Record', 'Resident', 'Field', 'Before', 'After'];
    const lines = entries.flatMap((e) => {
      const common = [
        whenFormat.format(new Date(e.at)),
        e.actorId ? (e.actorName ?? 'Unknown user') : 'System',
        ACTION_LABELS[e.action],
        e.recordLabel,
        (e.patientId && patientNames.get(e.patientId)) || '',
      ];
      const changes = e.changes.length ? e.changes : [{ label: '', before: null, after: null }];
      return changes.map((c) => [...common, c.label, formatAuditValue(c.before), formatAuditValue(c.after)]);
    });
    const csv = [header, ...lines].map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdminOrManager) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600 dark:text-gray-300">The audit trail is available to managers and administrators.</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Audit Trail' }]} />
      <Header
        title="Audit Trail"
        subtitle="Every change to resident records, medications, incidents and staff access: who, what and when."
      />

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Resident"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            options={[
              { value: '', label: 'All residents' },
              ...patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
            ]}
          />
          <Select
            label="Record type"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            options={[
              { value: '', label: 'All records' },
              ...Object.entries(AUDIT_RECORD_LABELS).map(([value, label]) => ({
                value, label: label.charAt(0).toUpperCase() + label.slice(1),
              })),
            ]}
          />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button variant="secondary" onClick={verify} disabled={isVerifying}>
            <ShieldCheck className="w-4 h-4" />
            {isVerifying ? 'Checking…' : 'Verify integrity'}
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={entries.length === 0}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Entries */}
      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12">
          <ScrollText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300">No changes recorded for these filters.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {entries.map((entry) => {
              const isOpen = expanded.has(entry.id);
              const patientName = (entry.patientId && patientNames.get(entry.patientId)) || null;
              return (
                <li key={entry.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => toggle(entry.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left min-h-[44px]"
                  >
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 mt-1 shrink-0 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-gray-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-white">{describeAuditEntry(entry, patientName)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {whenFormat.format(new Date(entry.at))}
                        {entry.action === 'UPDATE' && entry.changes.length > 0 &&
                          ` · ${entry.changes.map((c) => c.label.toLowerCase()).join(', ')}`}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_STYLES[entry.action]}`}>
                      {ACTION_LABELS[entry.action]}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 overflow-x-auto">
                      {entry.changes.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No readable field changes.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                              <th className="py-1 pr-4 font-medium">Field</th>
                              {entry.action !== 'INSERT' && <th className="py-1 pr-4 font-medium">Before</th>}
                              {entry.action !== 'DELETE' && <th className="py-1 font-medium">After</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {entry.changes.map((c) => (
                              <tr key={c.field} className="align-top">
                                <td className="py-1.5 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{c.label}</td>
                                {entry.action !== 'INSERT' && (
                                  <td className="py-1.5 pr-4 text-gray-800 dark:text-gray-100 break-words">{formatAuditValue(c.before)}</td>
                                )}
                                {entry.action !== 'DELETE' && (
                                  <td className="py-1.5 text-gray-800 dark:text-gray-100 break-words">{formatAuditValue(c.after)}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {entries.length === PAGE_SIZE && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Showing the latest {PAGE_SIZE} changes. Narrow the date range or filters to see older entries.
            </p>
          )}
        </>
      )}
    </div>
  );
}
