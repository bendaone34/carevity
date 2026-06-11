'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import PatientCard from '@/components/patients/PatientCard';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore } from '@/lib/store';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

function PatientCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const { patients = [], isLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const filteredPatients = useMemo(() => {
    if (!patients || patients.length === 0) return [];

    let result = [...patients];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.firstName?.toLowerCase().includes(query) ||
          p.lastName?.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query) ||
          p.phone?.includes(query)
      );
    }

    if (filterGender !== 'all') {
      result = result.filter((p) => p.gender === filterGender);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [patients, searchQuery, filterGender, sortBy]);

  const genderOptions = [
    { value: 'all', label: 'All Genders' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'date', label: 'Sort by Date Added' },
  ];

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Patients' }]} />
      <Header
        title="Patients"
        subtitle={isLoading ? 'Loading patients...' : `Manage your ${patients?.length || 0} patient${patients.length !== 1 ? 's' : ''}`}
        showAddButton
        addButtonText="Add Patient"
        addButtonHref="/patients/new"
      />

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search patients..."
              icon={<Search className="w-5 h-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Select
              options={genderOptions}
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
            />
            <Select
              options={sortOptions}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Skeleton while loading */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PatientCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Users className="w-10 h-10 text-sky-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {searchQuery ? 'No patients found' : 'No patients yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            {searchQuery
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Add your first resident to get started with care management.'}
          </p>
          {!searchQuery && (
            <Link
              href="/patients/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Add first resident
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
