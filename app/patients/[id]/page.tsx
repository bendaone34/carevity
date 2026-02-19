'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  AlertCircle,
  Heart,
  User,
  Edit,
  Trash2,
  ArrowLeft,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react';

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

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { patients, deletePatient, appointments, medicalRecords } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  const patientId = params.id as string;

  // Debug logs
  useEffect(() => {
    console.log('=== PATIENT DETAIL PAGE DEBUG ===');
    console.log('URL Params:', params);
    console.log('Patient ID from URL:', patientId);
    console.log('Type of Patient ID:', typeof patientId);
    console.log('Number of patients in store:', patients.length);
    console.log('All patient IDs:', patients.map(p => ({ id: p.id, type: typeof p.id, name: p.firstName })));
    
    // Try to find the patient
    const found = patients.find((p) => p.id === patientId);
    console.log('Found patient:', found);
    
    // Also try with number comparison
    const foundWithNumber = patients.find((p) => p.id == patientId);
    console.log('Found with loose comparison:', foundWithNumber);
    
    setIsLoading(false);
  }, [params, patientId, patients]);

  // Find patient - try both string and loose comparison
  const patient = patients.find((p) => p.id === patientId) || patients.find((p) => String(p.id) === String(patientId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          Patient not found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          The patient you&apos;re looking for doesn&apos;t exist.
        </p>
        
        {/* Debug info */}
        <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 mb-4 text-sm">
          <p className="text-gray-600 dark:text-gray-300">Debug Info:</p>
          <p className="text-gray-500 dark:text-gray-400">Looking for ID: "{patientId}"</p>
          <p className="text-gray-500 dark:text-gray-400">Available IDs: {patients.map(p => `"${p.id}"`).join(', ')}</p>
          <p className="text-gray-500 dark:text-gray-400">Total patients: {patients.length}</p>
        </div>
        
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </Link>
      </div>
    );
  }

  const patientAppointments = appointments.filter((a) => a.patientId === patient.id);
  const patientRecords = medicalRecords.filter((r) => r.patientId === patient.id);

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this patient?')) {
      deletePatient(patient.id);
      router.push('/patients');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Back Button */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </Link>

      {/* Patient Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">
                {getInitials(patient.firstName, patient.lastName)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Patient ID: #{patient.id} • Added {formatDate(patient.createdAt)}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 capitalize">
                  {patient.gender}
                </span>
                {patient.bloodType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                    {patient.bloodType}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {calculateAge(patient.dateOfBirth)} years old
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-800 dark:text-white">{patient.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-medium text-gray-800 dark:text-white">{patient.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                <p className="font-medium text-gray-800 dark:text-white">{patient.address || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                <p className="font-medium text-gray-800 dark:text-white">{formatDate(patient.dateOfBirth)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Medical Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Droplets className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Blood Type</p>
                <p className="font-medium text-gray-800 dark:text-white">{patient.bloodType || 'Unknown'}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Allergies</p>
              </div>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, idx) => (
                    <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No known allergies</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Medical Conditions</p>
              </div>
              {patient.medicalConditions && patient.medicalConditions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.medicalConditions.map((condition, idx) => (
                    <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      {condition}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No medical conditions</p>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Emergency Contact</h3>
          {patient.emergencyContact && patient.emergencyContact.name ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-800 dark:text-white">{patient.emergencyContact.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-800 dark:text-white">{patient.emergencyContact.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Relationship</p>
                  <p className="font-medium text-gray-800 dark:text-white">{patient.emergencyContact.relationship}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No emergency contact</p>
            </div>
          )}
        </div>
      </div>

      {/* Appointments & Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Appointments */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Appointments</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{patientAppointments.length} total</span>
          </div>
          {patientAppointments.length > 0 ? (
            <div className="space-y-3">
              {patientAppointments.slice(0, 3).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-sky-500" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white capitalize">{apt.type}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(apt.date)} at {apt.time}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                    apt.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                    'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No appointments</p>
          )}
        </div>

        {/* Records */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Medical Records</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{patientRecords.length} total</span>
          </div>
          {patientRecords.length > 0 ? (
            <div className="space-y-3">
              {patientRecords.slice(0, 3).map((record) => (
                <div key={record.id} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{record.diagnosis}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(record.date)} • {record.doctorName}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No records</p>
          )}
        </div>
      </div>
    </div>
  );
}