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

export default function RecordsPage() {
  const { medicalRecords, patients } = useStore();
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
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRecords.map((record) => (
            <MedicalRecordCard key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">
            No medical records found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or create a new record
          </p>
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