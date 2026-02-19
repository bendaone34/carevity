'use client';

import Link from 'next/link';
import { Patient } from '@/lib/types';
import { Phone, Mail, Calendar, ChevronRight, AlertCircle } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export default function PatientCard({ patient }: PatientCardProps) {
  // Debug log
  console.log('PatientCard - Patient ID:', patient.id, 'Link:', `/patients/${patient.id}`);

  return (
    <Link href={`/patients/${patient.id}`}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-lg">
              {getInitials(patient.firstName, patient.lastName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                {patient.firstName} {patient.lastName}
              </h3>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{patient.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{patient.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>
                  {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)} years)
                </span>
              </div>
            </div>

            {/* Debug: Show patient ID */}
            <p className="text-xs text-gray-400 mt-2">ID: {patient.id}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {patient.bloodType && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                  {patient.bloodType}
                </span>
              )}
              {patient.medicalConditions && patient.medicalConditions.slice(0, 2).map((condition, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                >
                  {condition}
                </span>
              ))}
              {patient.allergies && patient.allergies.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {patient.allergies.length} Allergies
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}