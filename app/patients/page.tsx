'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import PatientCard from '@/components/patients/PatientCard';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore } from '@/lib/store';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';

export default function PatientsPage() {
  const { patients = [] } = useStore();
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
      <Header
        title="Patients"
        subtitle={`Manage your ${patients?.length || 0} patients`}
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
          <div className="flex gap-4">
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

      {/* Patients Grid */}
      {filteredPatients && filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">
            {searchQuery ? 'No patients found' : 'No patients yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery ? 'Try adjusting your search or filter criteria' : 'Add your first patient to get started'}
          </p>
          {!searchQuery && (
            <Link
              href="/patients/new"
              className="inline-flex items-center px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Add first patient
            </Link>
          )}
        </div>
      )}
    </div>
  );
}