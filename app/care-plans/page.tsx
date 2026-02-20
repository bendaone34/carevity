'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import CarePlanCard from '@/components/care-plans/CarePlanCard';
import CarePlanForm from '@/components/care-plans/CarePlanForm';
import CarePlanDetails from '@/components/care-plans/CarePlanDetails';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore } from '@/lib/store';
import { CarePlan } from '@/lib/types';
import { ClipboardList, Search } from 'lucide-react';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | CarePlan['status'];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'pending',   label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

export default function CarePlansPage() {
  const { carePlans, patients, deleteCarePlan } = useStore();

  const [isFormOpen, setIsFormOpen]       = useState(false);
  const [selectedPlan, setSelectedPlan]   = useState<CarePlan | null>(null);
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterPatient, setFilterPatient] = useState('all');

  const filtered = useMemo(() => {
    let result = [...carePlans];
    if (statusFilter !== 'all') result = result.filter((cp) => cp.status === statusFilter);
    if (filterPatient !== 'all') result = result.filter((cp) => cp.patientId === filterPatient);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (cp) =>
          cp.title.toLowerCase().includes(q) ||
          cp.patientName.toLowerCase().includes(q) ||
          cp.carerName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [carePlans, statusFilter, filterPatient, searchQuery]);

  const counts = useMemo(() => ({
    all:       carePlans.length,
    active:    carePlans.filter((cp) => cp.status === 'active').length,
    pending:   carePlans.filter((cp) => cp.status === 'pending').length,
    completed: carePlans.filter((cp) => cp.status === 'completed').length,
  }), [carePlans]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this care plan? This cannot be undone.')) return;
    try {
      await deleteCarePlan(id);
      toast.success('Care plan deleted');
      if (selectedPlan?.id === id) setSelectedPlan(null);
    } catch {
      toast.error('Failed to delete care plan');
    }
  };

  const patientOptions = [
    { value: 'all', label: 'All Patients' },
    ...patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
  ];

  return (
    <div className="animate-fadeIn">
      <Header
        title="Care Plans"
        subtitle="Manage and track patient care plans"
        showAddButton
        addButtonText="New Care Plan"
        onAddClick={() => setIsFormOpen(true)}
      />

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-1 w-fit">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              statusFilter === value
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            {label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              statusFilter === value ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
            }`}>
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by title, patient, or carer..."
              icon={<Search className="w-5 h-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            options={patientOptions}
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="w-52"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((plan) => (
            <CarePlanCard
              key={plan.id}
              plan={plan}
              onClick={() => setSelectedPlan(plan)}
              onDelete={() => handleDelete(plan.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">No care plans found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {carePlans.length === 0
              ? 'Create your first care plan to get started.'
              : 'Try adjusting your search or filters.'}
          </p>
          {carePlans.length === 0 && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Create care plan
            </button>
          )}
        </div>
      )}

      {/* New plan modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Care Plan" size="lg">
        <CarePlanForm onClose={() => setIsFormOpen(false)} />
      </Modal>

      {/* Detail modal */}
      <Modal
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title="Care Plan Details"
        size="lg"
      >
        {selectedPlan && (
          <CarePlanDetails
            plan={carePlans.find((cp) => cp.id === selectedPlan.id) ?? selectedPlan}
            onClose={() => setSelectedPlan(null)}
          />
        )}
      </Modal>
    </div>
  );
}
