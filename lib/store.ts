import { create } from 'zustand';
import { Patient, Appointment, MedicalRecord } from './types';
import { createClient } from '@/lib/supabase/client';

// ─── DB → TS mappers ─────────────────────────────────────────────────────────

function mapPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    phone: row.phone as string,
    dateOfBirth: row.date_of_birth as string,
    gender: row.gender as Patient['gender'],
    address: row.address as string,
    bloodType: row.blood_type as string,
    allergies: (row.allergies as string[]) || [],
    medicalConditions: (row.medical_conditions as string[]) || [],
    emergencyContact: {
      name: (row.emergency_contact_name as string) || '',
      phone: (row.emergency_contact_phone as string) || '',
      relationship: (row.emergency_contact_relationship as string) || '',
    },
    createdAt: ((row.created_at as string) || '').split('T')[0],
    avatar: row.avatar_url as string | undefined,
  };
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  const patient = row.patients as { first_name: string; last_name: string } | null;
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
    doctorName: row.doctor_name as string,
    date: row.date as string,
    time: row.time as string,
    type: row.type as Appointment['type'],
    status: row.status as Appointment['status'],
    notes: row.notes as string | undefined,
  };
}

function mapMedicalRecord(row: Record<string, unknown>): MedicalRecord {
  const patient = row.patients as { first_name: string; last_name: string } | null;
  const vitals = row.vitals as MedicalRecord['vitals'] | null;
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
    date: row.date as string,
    diagnosis: row.diagnosis as string,
    treatment: row.treatment as string,
    prescriptions: (row.prescriptions as string[]) || [],
    doctorName: row.doctor_name as string,
    notes: row.notes as string | undefined,
    vitals: vitals ?? undefined,
  };
}

// ─── TS → DB mappers ─────────────────────────────────────────────────────────

function patientToDb(p: Omit<Patient, 'id' | 'createdAt'>) {
  return {
    first_name: p.firstName,
    last_name: p.lastName,
    email: p.email,
    phone: p.phone,
    date_of_birth: p.dateOfBirth,
    gender: p.gender,
    address: p.address,
    blood_type: p.bloodType,
    allergies: p.allergies,
    medical_conditions: p.medicalConditions,
    emergency_contact_name: p.emergencyContact.name,
    emergency_contact_phone: p.emergencyContact.phone,
    emergency_contact_relationship: p.emergencyContact.relationship,
    avatar_url: p.avatar,
  };
}

function appointmentToDb(a: Omit<Appointment, 'id' | 'patientName'>) {
  return {
    patient_id: a.patientId,
    doctor_name: a.doctorName,
    date: a.date,
    time: a.time,
    type: a.type,
    status: a.status,
    notes: a.notes,
  };
}

function medicalRecordToDb(r: Omit<MedicalRecord, 'id' | 'patientName'>) {
  return {
    patient_id: r.patientId,
    date: r.date,
    diagnosis: r.diagnosis,
    treatment: r.treatment,
    prescriptions: r.prescriptions,
    doctor_name: r.doctorName,
    notes: r.notes,
    vitals: r.vitals,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppState {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Patients
  patients: Patient[];
  fetchPatients: () => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;

  // Appointments
  appointments: Appointment[];
  fetchAppointments: () => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  // Medical Records
  medicalRecords: MedicalRecord[];
  fetchMedicalRecords: () => Promise<void>;
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => Promise<void>;
  updateMedicalRecord: (id: string, record: Partial<MedicalRecord>) => Promise<void>;
  deleteMedicalRecord: (id: string) => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // ─── Patients ─────────────────────────────────────────────────────────────

  patients: [],

  fetchPatients: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    set({ patients: (data ?? []).map(mapPatient) });
  },

  addPatient: async (patient) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('patients')
      .insert(patientToDb(patient))
      .select()
      .single();
    if (error) throw error;
    set((state) => ({ patients: [mapPatient(data), ...state.patients] }));
  },

  updatePatient: async (id, patient) => {
    const supabase = createClient();
    const existing = get().patients.find((p) => p.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patient };
    const { data, error } = await supabase
      .from('patients')
      .update(patientToDb(merged))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? mapPatient(data) : p)),
    }));
  },

  deletePatient: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
      appointments: state.appointments.filter((a) => a.patientId !== id),
      medicalRecords: state.medicalRecords.filter((r) => r.patientId !== id),
    }));
  },

  getPatientById: (id) => get().patients.find((p) => p.id === id),

  // ─── Appointments ──────────────────────────────────────────────────────────

  appointments: [],

  fetchAppointments: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(first_name, last_name)')
      .order('date', { ascending: true });
    if (error) throw error;
    set({ appointments: (data ?? []).map(mapAppointment) });
  },

  addAppointment: async (appointment) => {
    const supabase = createClient();
    const { patientName: _, ...rest } = appointment;
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentToDb(rest))
      .select('*, patients(first_name, last_name)')
      .single();
    if (error) throw error;
    set((state) => ({ appointments: [...state.appointments, mapAppointment(data)] }));
  },

  updateAppointment: async (id, appointment) => {
    const supabase = createClient();
    const existing = get().appointments.find((a) => a.id === id);
    if (!existing) return;
    const { patientName: _, ...updateFields } = { ...existing, ...appointment };
    const { data, error } = await supabase
      .from('appointments')
      .update(appointmentToDb(updateFields))
      .eq('id', id)
      .select('*, patients(first_name, last_name)')
      .single();
    if (error) throw error;
    set((state) => ({
      appointments: state.appointments.map((a) => (a.id === id ? mapAppointment(data) : a)),
    }));
  },

  deleteAppointment: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== id),
    }));
  },

  // ─── Medical Records ───────────────────────────────────────────────────────

  medicalRecords: [],

  fetchMedicalRecords: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, patients(first_name, last_name)')
      .order('date', { ascending: false });
    if (error) throw error;
    set({ medicalRecords: (data ?? []).map(mapMedicalRecord) });
  },

  addMedicalRecord: async (record) => {
    const supabase = createClient();
    const { patientName: _, ...rest } = record;
    const { data, error } = await supabase
      .from('medical_records')
      .insert(medicalRecordToDb(rest))
      .select('*, patients(first_name, last_name)')
      .single();
    if (error) throw error;
    set((state) => ({ medicalRecords: [mapMedicalRecord(data), ...state.medicalRecords] }));
  },

  updateMedicalRecord: async (id, record) => {
    const supabase = createClient();
    const existing = get().medicalRecords.find((r) => r.id === id);
    if (!existing) return;
    const { patientName: _, ...updateFields } = { ...existing, ...record };
    const { data, error } = await supabase
      .from('medical_records')
      .update(medicalRecordToDb(updateFields))
      .eq('id', id)
      .select('*, patients(first_name, last_name)')
      .single();
    if (error) throw error;
    set((state) => ({
      medicalRecords: state.medicalRecords.map((r) => (r.id === id ? mapMedicalRecord(data) : r)),
    }));
  },

  deleteMedicalRecord: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('medical_records').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({
      medicalRecords: state.medicalRecords.filter((r) => r.id !== id),
    }));
  },

  // ─── Search ────────────────────────────────────────────────────────────────

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
