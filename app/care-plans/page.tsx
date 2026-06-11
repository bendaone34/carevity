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
import { Skeleton } from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

function CarePlanSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

type StatusFilter = 'all' | CarePlan['status'];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'pending',   label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

export default function CarePlansPage() {
  const { carePlans, patients, deleteCarePlan, isLoading } = useStore();

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
      <Breadcrumbs items={[{ label: 'Care Plans' }]} />
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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <CarePlanSkeleton key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ClipboardList className="w-10 h-10 text-sky-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {carePlans.length === 0 ? 'No care plans yet' : 'No care plans found'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            {carePlans.length === 0
              ? 'Create personalised care plans for each resident to track their goals and progress.'
              : 'Try adjusting your search or filters to find what you\'re looking for.'}
          </p>
          {carePlans.length === 0 && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Create first care plan
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
