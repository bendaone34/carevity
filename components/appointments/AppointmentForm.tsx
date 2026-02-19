'use client';

import { useState } from 'react';
import { Appointment } from '@/lib/types';
import { useStore } from '@/lib/store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface AppointmentFormProps {
  appointment?: Appointment;
  onClose: () => void;
}

const doctors = [
  'Dr. Emily Smith',
  'Dr. James Wilson',
  'Dr. Sarah Lee',
  'Dr. Michael Brown',
  'Dr. Jennifer Davis',
];


export default function AppointmentForm({ appointment, onClose }: AppointmentFormProps) {
  const { patients, addAppointment, updateAppointment } = useStore();
  const isEditing = !!appointment;

  const [formData, setFormData] = useState({
    patientId: appointment?.patientId || '',
    doctorName: appointment?.doctorName || doctors[0],
    date: appointment?.date || new Date().toISOString().split('T')[0],
    time: appointment?.time || '09:00',
    type: appointment?.type || 'checkup',
    status: appointment?.status || 'scheduled',
    notes: appointment?.notes || '',
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

    if (!selectedPatient) {
      toast.error('Please select a patient');
      setIsLoading(false);
      return;
    }

    const appointmentData = {
      patientId: formData.patientId,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      doctorName: formData.doctorName,
      date: formData.date,
      time: formData.time,
      type: formData.type as Appointment['type'],
      status: formData.status as Appointment['status'],
      notes: formData.notes,
    };

    try {
      if (isEditing && appointment) {
        await updateAppointment(appointment.id, appointmentData);
        toast.success('Appointment updated successfully');
      } else {
        await addAppointment(appointmentData);
        toast.success('Appointment created successfully');
      }
      onClose();
    } catch (error) {
      toast.error('Failed to save appointment');
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

  const typeOptions = [
    { value: 'checkup', label: 'Check-up' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'emergency', label: 'Emergency' },
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <Input
          label="Date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
        <Input
          label="Time"
          name="time"
          type="time"
          value={formData.time}
          onChange={handleChange}
          required
        />
        <Select
          label="Type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          options={typeOptions}
        />
        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={statusOptions}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all duration-200 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}