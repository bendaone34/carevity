'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/lib/types';
import { useStore } from '@/lib/store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Save, X } from 'lucide-react';

interface PatientFormProps {
  patient?: Patient;
  onClose?: () => void;
}

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const bloodTypeOptions = [
  { value: '', label: 'Select Blood Type' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

export default function PatientForm({ patient, onClose }: PatientFormProps) {
  const router = useRouter();
  const { addPatient, updatePatient } = useStore();
  const isEditing = !!patient;

  const [formData, setFormData] = useState({
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    dateOfBirth: patient?.dateOfBirth || '',
    gender: patient?.gender || 'male',
    address: patient?.address || '',
    bloodType: patient?.bloodType || '',
    allergies: patient?.allergies.join(', ') || '',
    medicalConditions: patient?.medicalConditions.join(', ') || '',
    emergencyContactName: patient?.emergencyContact.name || '',
    emergencyContactPhone: patient?.emergencyContact.phone || '',
    emergencyContactRelation: patient?.emergencyContact.relationship || '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const patientData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender as 'male' | 'female' | 'other',
      address: formData.address,
      bloodType: formData.bloodType,
      allergies: formData.allergies.split(',').map((a) => a.trim()).filter(Boolean),
      medicalConditions: formData.medicalConditions.split(',').map((c) => c.trim()).filter(Boolean),
      emergencyContact: {
        name: formData.emergencyContactName,
        phone: formData.emergencyContactPhone,
        relationship: formData.emergencyContactRelation,
      },
    };

    try {
      if (isEditing && patient) {
        updatePatient(patient.id, patientData);
      } else {
        addPatient(patientData);
      }
      router.push('/patients');
    } catch (error) {
      console.error('Error saving patient:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            placeholder="Enter first name"
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            placeholder="Enter last name"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter email address"
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="(555) 123-4567"
          />
          <Input
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
            required
          />
          <Select
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={genderOptions}
          />
          <div className="md:col-span-2">
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter full address"
            />
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Medical Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Blood Type"
            name="bloodType"
            value={formData.bloodType}
            onChange={handleChange}
            options={bloodTypeOptions}
          />
          <Input
            label="Allergies"
            name="allergies"
            value={formData.allergies}
            onChange={handleChange}
            placeholder="Separate with commas (e.g., Penicillin, Peanuts)"
          />
          <div className="md:col-span-2">
            <Input
              label="Medical Conditions"
              name="medicalConditions"
              value={formData.medicalConditions}
              onChange={handleChange}
              placeholder="Separate with commas (e.g., Diabetes, Hypertension)"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Contact Name"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleChange}
            placeholder="Full name"
          />
          <Input
            label="Contact Phone"
            name="emergencyContactPhone"
            type="tel"
            value={formData.emergencyContactPhone}
            onChange={handleChange}
            placeholder="(555) 123-4567"
          />
          <Input
            label="Relationship"
            name="emergencyContactRelation"
            value={formData.emergencyContactRelation}
            onChange={handleChange}
            placeholder="e.g., Spouse, Parent"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={() => (onClose ? onClose() : router.back())}
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          <Save className="w-4 h-4" />
          {isEditing ? 'Update Patient' : 'Add Patient'}
        </Button>
      </div>
    </form>
  );
}