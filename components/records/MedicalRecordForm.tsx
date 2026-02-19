'use client';

import { useState } from 'react';
import { MedicalRecord } from '@/lib/types';
import { useStore } from '@/lib/store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Save, X } from 'lucide-react';
const doctors = [
  'Dr. Emily Smith',
  'Dr. James Wilson',
  'Dr. Sarah Lee',
  'Dr. Michael Brown',
  'Dr. Jennifer Davis',
];

interface MedicalRecordFormProps {
  record?: MedicalRecord;
  onClose: () => void;
}

export default function MedicalRecordForm({ record, onClose }: MedicalRecordFormProps) {
  const { patients, addMedicalRecord, updateMedicalRecord } = useStore();
  const isEditing = !!record;

  const [formData, setFormData] = useState({
    patientId: record?.patientId || '',
    date: record?.date || new Date().toISOString().split('T')[0],
    diagnosis: record?.diagnosis || '',
    treatment: record?.treatment || '',
    prescriptions: record?.prescriptions.join(', ') || '',
    doctorName: record?.doctorName || doctors[0],
    notes: record?.notes || '',
    bloodPressure: record?.vitals?.bloodPressure || '',
    heartRate: record?.vitals?.heartRate?.toString() || '',
    temperature: record?.vitals?.temperature?.toString() || '',
    weight: record?.vitals?.weight?.toString() || '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const selectedPatient = patients.find((p) => p.id === formData.patientId);

    const recordData: Omit<MedicalRecord, 'id'> = {
      patientId: formData.patientId,
      patientName: selectedPatient
        ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
        : '',
      date: formData.date,
      diagnosis: formData.diagnosis,
      treatment: formData.treatment,
      prescriptions: formData.prescriptions.split(',').map((p) => p.trim()).filter(Boolean),
      doctorName: formData.doctorName,
      notes: formData.notes,
      vitals: {
        bloodPressure: formData.bloodPressure,
        heartRate: parseInt(formData.heartRate) || 0,
        temperature: parseFloat(formData.temperature) || 0,
        weight: parseFloat(formData.weight) || 0,
      },
    };

    try {
      if (isEditing && record) {
        await updateMedicalRecord(record.id, recordData);
      } else {
        await addMedicalRecord(recordData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving medical record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const patientOptions = [
    { value: '', label: 'Select Patient' },
    ...patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName}`,
    })),
  ];

  const doctorOptions = doctors.map((d) => ({
    value: d,
    label: d,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Patient"
          name="patientId"
          value={formData.patientId}
          onChange={handleChange}
          options={patientOptions}
          required
        />
        <Select
          label="Doctor"
          name="doctorName"
          value={formData.doctorName}
          onChange={handleChange}
          options={doctorOptions}
          required
        />
        <div className="md:col-span-2">
          <Input
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Medical Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Diagnosis
          </label>
          <textarea
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all duration-200 bg-white resize-none"
            placeholder="Enter diagnosis..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Treatment
          </label>
          <textarea
            name="treatment"
            value={formData.treatment}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all duration-200 bg-white resize-none"
            placeholder="Enter treatment plan..."
            required
          />
        </div>
        <Input
          label="Prescriptions"
          name="prescriptions"
          value={formData.prescriptions}
          onChange={handleChange}
          placeholder="Separate with commas (e.g., Aspirin 100mg, Lisinopril 10mg)"
        />
      </div>

      {/* Vitals */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Vitals</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Blood Pressure"
            name="bloodPressure"
            value={formData.bloodPressure}
            onChange={handleChange}
            placeholder="120/80"
          />
          <Input
            label="Heart Rate (bpm)"
            name="heartRate"
            type="number"
            value={formData.heartRate}
            onChange={handleChange}
            placeholder="72"
          />
          <Input
            label="Temperature (°F)"
            name="temperature"
            type="number"
            step="0.1"
            value={formData.temperature}
            onChange={handleChange}
            placeholder="98.6"
          />
          <Input
            label="Weight (lbs)"
            name="weight"
            type="number"
            value={formData.weight}
            onChange={handleChange}
            placeholder="150"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all duration-200 bg-white resize-none"
          placeholder="Any additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onClose}>
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          <Save className="w-4 h-4" />
          {isEditing ? 'Update Record' : 'Create Record'}
        </Button>
      </div>
    </form>
  );
}