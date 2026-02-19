import { create } from 'zustand';
import { Patient, Appointment, MedicalRecord } from './types';
import { patients as initialPatients, appointments as initialAppointments, medicalRecords as initialRecords } from '@/data/mockData';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

interface AppState {
  // Patients
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatientById: (id: string) => Patient | undefined;

  // Appointments
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;

  // Medical Records
  medicalRecords: MedicalRecord[];
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => void;
  updateMedicalRecord: (id: string, record: Partial<MedicalRecord>) => void;
  deleteMedicalRecord: (id: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Patients - with fallback to empty array
  patients: initialPatients || [],
  
  addPatient: (patient) =>
    set((state) => ({
      patients: [
        ...state.patients,
        {
          ...patient,
          id: generateId(),
          createdAt: new Date().toISOString().split('T')[0],
        },
      ],
    })),
    
  updatePatient: (id, patient) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === id ? { ...p, ...patient } : p
      ),
    })),
    
  deletePatient: (id) =>
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
    })),
    
  getPatientById: (id) => {
    const state = get();
    return state.patients?.find((p) => p.id === id || String(p.id) === String(id));
  },

  // Appointments - with fallback to empty array
  appointments: initialAppointments || [],
  
  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [
        ...state.appointments,
        { ...appointment, id: generateId() },
      ],
    })),
    
  updateAppointment: (id, appointment) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, ...appointment } : a
      ),
    })),
    
  deleteAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== id),
    })),

  // Medical Records - with fallback to empty array
  medicalRecords: initialRecords || [],
  
  addMedicalRecord: (record) =>
    set((state) => ({
      medicalRecords: [
        ...state.medicalRecords,
        { ...record, id: generateId() },
      ],
    })),
    
  updateMedicalRecord: (id, record) =>
    set((state) => ({
      medicalRecords: state.medicalRecords.map((r) =>
        r.id === id ? { ...r, ...record } : r
      ),
    })),
    
  deleteMedicalRecord: (id) =>
    set((state) => ({
      medicalRecords: state.medicalRecords.filter((r) => r.id !== id),
    })),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));