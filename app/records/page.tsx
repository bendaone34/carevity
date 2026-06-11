'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import MedicalRecordCard from '@/components/records/MedicalRecordCard';
import MedicalRecordForm from '@/components/records/MedicalRecordForm';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore } from '@/lib/store';
import { Search, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

function RecordCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export default function RecordsPage() {
  const { medicalRecords, patients, isLoading } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPatient, setFilterPatient] = useState('all');

  const filteredRecords = useMemo(() => {
    let result = [...medicalRecords];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.patientName.toLowerCase().includes(query) ||
          r.diagnosis.toLowerCase().includes(query) ||
          r.doctorName.toLowerCase().includes(query)
      );
    }

    // Patient filter
    if (filterPatient !== 'all') {
      result = result.filter((r) => r.patientId === filterPatient);
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [medicalRecords, searchQuery, filterPatient]);

  const patientOptions = [
    { value: 'all', label: 'All Patients' },
    ...patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName}`,
    })),
  ];

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Medical Records' }]} />
      <Header
        title="Medical Records"
        subtitle="View and manage patient medical records"
        showAddButton
        addButtonText="New Record"
        onAddClick={() => setIsModalOpen(true)}
      />

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search records..."
              icon={<Search className="w-5 h-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            options={patientOptions}
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      {/* Records Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <RecordCardSkeleton key={i} />)}
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRecords.map((record) => (
            <MedicalRecordCard key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FileText className="w-10 h-10 text-sky-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {medicalRecords.length === 0 ? 'No medical records yet' : 'No records found'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            {medicalRecords.length === 0
              ? 'Add medical records to track diagnoses, treatments, and prescriptions for your residents.'
              : 'Try adjusting your search or patient filter.'}
          </p>
          {medicalRecords.length === 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Add first record
            </button>
          )}
        </div>
      )}

      {/* New Record Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Medical Record"
        size="lg"
      >
        <MedicalRecordForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}