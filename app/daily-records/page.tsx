'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import DailyCareRecordCard from '@/components/daily-records/DailyCareRecordCard';
import DailyCareRecordForm from '@/components/daily-records/DailyCareRecordForm';
import DailyCareRecordDetails from '@/components/daily-records/DailyCareRecordDetails';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore } from '@/lib/store';
import { DailyCareRecord } from '@/lib/types';
import { BookOpen, Search, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

function DailyRecordSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3 my-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 rounded-lg" />)}
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

const today = new Date().toISOString().split('T')[0];

export default function DailyRecordsPage() {
  const { dailyCareRecords, patients, deleteDailyCareRecord, isLoading } = useStore();

  const [isFormOpen,    setIsFormOpen]    = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DailyCareRecord | null>(null);
  const [dateFilter,    setDateFilter]    = useState(today);
  const [patientFilter, setPatientFilter] = useState('all');
  const [searchQuery,   setSearchQuery]   = useState('');

  const filtered = useMemo(() => {
    let result = [...dailyCareRecords];
    if (dateFilter)           result = result.filter((r) => r.date === dateFilter);
    if (patientFilter !== 'all') result = result.filter((r) => r.patientId === patientFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.patientName.toLowerCase().includes(q) || r.carerName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [dailyCareRecords, dateFilter, patientFilter, searchQuery]);

  const todayCount = useMemo(() => dailyCareRecords.filter((r) => r.date === today).length, [dailyCareRecords]);
  const incidentCount = useMemo(() => filtered.filter((r) => r.incidents.trim()).length, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await deleteDailyCareRecord(id);
      toast.success('Record deleted');
      if (selectedRecord?.id === id) setSelectedRecord(null);
    } catch {
      toast.error('Failed to delete record');
    }
  };

  const patientOptions = [
    { value: 'all', label: 'All Patients' },
    ...patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
  ];

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Daily Care Records' }]} />
      <Header
        title="Daily Care Records"
        subtitle="Log and review daily care activities for each patient"
        showAddButton
        addButtonText="New Record"
        onAddClick={() => setIsFormOpen(true)}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's records",  value: todayCount,                     color: 'text-sky-600 dark:text-sky-400' },
          { label: 'Showing',          value: filtered.length,                color: 'text-gray-700 dark:text-gray-300' },
          { label: 'Incidents',        value: incidentCount,                  color: incidentCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400' },
          { label: 'Total records',    value: dailyCareRecords.length,        color: 'text-gray-700 dark:text-gray-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by patient or carer..."
              icon={<Search className="w-5 h-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap"
              >
                All dates
              </button>
            )}
          </div>
          <Select
            options={patientOptions}
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="w-52"
          />
        </div>
      </div>

      {/* Records grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <DailyRecordSkeleton key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((record) => (
            <DailyCareRecordCard
              key={record.id}
              record={record}
              onClick={() => setSelectedRecord(record)}
              onDelete={() => handleDelete(record.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-10 h-10 text-sky-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {dateFilter && filtered.length === 0 && dailyCareRecords.length > 0
              ? 'No records for this date'
              : dailyCareRecords.length === 0
              ? 'No care records yet'
              : 'No records found'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            {dailyCareRecords.length === 0
              ? 'Start logging daily care activities, meals, and observations for each resident.'
              : 'Try adjusting the date or filters to find what you\'re looking for.'}
          </p>
          {dailyCareRecords.length === 0 && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Log first care record
            </button>
          )}
        </div>
      )}

      {/* New record modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Daily Care Record" size="xl">
        <DailyCareRecordForm onClose={() => setIsFormOpen(false)} />
      </Modal>

      {/* Detail modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Daily Care Record"
        size="lg"
      >
        {selectedRecord && (
          <DailyCareRecordDetails
            record={dailyCareRecords.find((r) => r.id === selectedRecord.id) ?? selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </Modal>
    </div>
  );
}
