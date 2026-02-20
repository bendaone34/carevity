import { create } from 'zustand';
import { Patient, Appointment, MedicalRecord, CarePlan, CarePlanTask, DailyCareRecord, StaffMember } from './types';
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

function mapStaffMember(row: Record<string, unknown>, assignedPatientIds: string[]): StaffMember {
  return {
    id:                 row.id as string,
    fullName:           (row.full_name as string) ?? '',
    email:              (row.email     as string) ?? '',
    role:               row.role as StaffMember['role'],
    phone:              (row.phone     as string) ?? '',
    jobTitle:           (row.job_title as string) ?? '',
    assignedPatientIds,
    createdAt:          ((row.created_at as string) || '').split('T')[0],
    isOnboarded:        (row.is_onboarded as boolean) ?? false,
  };
}

function mapDailyCareRecord(row: Record<string, unknown>): DailyCareRecord {
  const patient = row.patients as { first_name: string; last_name: string } | null;
  const meals = (row.meals as Record<string, unknown>) ?? {};
  const pc    = (row.personal_care as Record<string, unknown>) ?? {};
  const bf    = (meals.breakfast as Record<string, unknown>) ?? {};
  const lu    = (meals.lunch     as Record<string, unknown>) ?? {};
  const di    = (meals.dinner    as Record<string, unknown>) ?? {};
  return {
    id:          row.id as string,
    patientId:   row.patient_id as string,
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
    date:        row.date as string,
    carerName:   row.carer_name as string,
    recordedAt:  row.recorded_at as string | undefined,
    meals: {
      breakfast: { eaten: (bf.eaten as boolean) ?? false, notes: (bf.notes as string) ?? '' },
      lunch:     { eaten: (lu.eaten as boolean) ?? false, notes: (lu.notes as string) ?? '' },
      dinner:    { eaten: (di.eaten as boolean) ?? false, notes: (di.notes as string) ?? '' },
      snacks:    (meals.snacks   as string)  ?? '',
      fluidsMl:  (meals.fluids_ml as number) ?? 0,
    },
    personalCare: {
      bathing:  (pc.bathing  as boolean) ?? false,
      grooming: (pc.grooming as boolean) ?? false,
      dressing: (pc.dressing as boolean) ?? false,
      oralCare: (pc.oral_care as boolean) ?? false,
      notes:    (pc.notes    as string)  ?? '',
    },
    moodScore: (row.mood_score as number) ?? 3,
    moodNotes: (row.mood_notes as string) ?? '',
    activity:  (row.activity   as string) ?? '',
    incidents: (row.incidents  as string) ?? '',
    notes:     (row.notes      as string) ?? '',
    createdAt: ((row.created_at as string) || '').split('T')[0],
  };
}

function dailyCareRecordToDb(r: Omit<DailyCareRecord, 'id' | 'createdAt' | 'patientName'>) {
  return {
    patient_id:   r.patientId,
    date:         r.date,
    carer_name:   r.carerName,
    recorded_at:  r.recordedAt || null,
    meals: {
      breakfast:  r.meals.breakfast,
      lunch:      r.meals.lunch,
      dinner:     r.meals.dinner,
      snacks:     r.meals.snacks,
      fluids_ml:  r.meals.fluidsMl,
    },
    personal_care: {
      bathing:   r.personalCare.bathing,
      grooming:  r.personalCare.grooming,
      dressing:  r.personalCare.dressing,
      oral_care: r.personalCare.oralCare,
      notes:     r.personalCare.notes,
    },
    mood_score: r.moodScore,
    mood_notes: r.moodNotes,
    activity:   r.activity,
    incidents:  r.incidents,
    notes:      r.notes,
  };
}

function mapCarePlanTask(row: Record<string, unknown>): CarePlanTask {
  return {
    id: row.id as string,
    carePlanId: row.care_plan_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    status: row.status as CarePlanTask['status'],
    dueDate: row.due_date as string | undefined,
    createdAt: ((row.created_at as string) || '').split('T')[0],
  };
}

function mapCarePlan(row: Record<string, unknown>): CarePlan {
  const patient = row.patients as { first_name: string; last_name: string } | null;
  const tasks = (row.care_plan_tasks as Record<string, unknown>[] | null) ?? [];
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
    title: row.title as string,
    description: row.description as string | undefined,
    goals: (row.goals as string[]) || [],
    carerName: row.carer_name as string,
    status: row.status as CarePlan['status'],
    startDate: row.start_date as string | undefined,
    endDate: row.end_date as string | undefined,
    notes: row.notes as string | undefined,
    tasks: tasks.map(mapCarePlanTask),
    createdAt: ((row.created_at as string) || '').split('T')[0],
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

  // Clinic
  clinicId: string | null;
  clinicName: string | null;
  setClinic: (id: string, name: string) => void;

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

  // Current user role
  currentUserRole: StaffMember['role'] | null;
  setCurrentUserRole: (role: StaffMember['role'] | null) => void;

  // Staff
  staffMembers: StaffMember[];
  fetchStaff: () => Promise<void>;
  inviteStaff: (email: string, fullName: string, role: 'manager' | 'carer') => Promise<void>;
  updateStaff: (id: string, updates: { fullName?: string; role?: StaffMember['role']; phone?: string; jobTitle?: string }) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  assignPatient: (staffId: string, patientId: string) => Promise<void>;
  unassignPatient: (staffId: string, patientId: string) => Promise<void>;

  // Daily Care Records
  dailyCareRecords: DailyCareRecord[];
  fetchDailyCareRecords: () => Promise<void>;
  addDailyCareRecord: (record: Omit<DailyCareRecord, 'id' | 'createdAt' | 'patientName'>) => Promise<void>;
  updateDailyCareRecord: (id: string, record: Partial<Omit<DailyCareRecord, 'patientName'>>) => Promise<void>;
  deleteDailyCareRecord: (id: string) => Promise<void>;

  // Care Plans
  carePlans: CarePlan[];
  fetchCarePlans: () => Promise<void>;
  addCarePlan: (
    plan: Omit<CarePlan, 'id' | 'createdAt' | 'patientName' | 'tasks'>,
    tasks: { title: string; description?: string; dueDate?: string }[]
  ) => Promise<void>;
  updateCarePlan: (id: string, plan: Partial<Omit<CarePlan, 'tasks'>>) => Promise<void>;
  deleteCarePlan: (id: string) => Promise<void>;
  updateCarePlanTask: (taskId: string, status: CarePlanTask['status']) => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // ─── Clinic ────────────────────────────────────────────────────────────────

  clinicId: null,
  clinicName: null,
  setClinic: (id, name) => set({ clinicId: id, clinicName: name }),

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
      .insert({ ...patientToDb(patient), clinic_id: get().clinicId })
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
      .insert({ ...appointmentToDb(rest), clinic_id: get().clinicId })
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
      .insert({ ...medicalRecordToDb(rest), clinic_id: get().clinicId })
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

  // ─── Staff ─────────────────────────────────────────────────────────────────

  currentUserRole: null,
  setCurrentUserRole: (role) => set({ currentUserRole: role }),

  staffMembers: [],

  fetchStaff: async () => {
    const supabase = createClient();
    const [profilesRes, assignmentsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('staff_patient_assignments').select('staff_id, patient_id'),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    const assignments = assignmentsRes.data ?? [];
    const staffMembers = (profilesRes.data ?? []).map((row) => {
      const patientIds = assignments
        .filter((a) => a.staff_id === row.id)
        .map((a) => a.patient_id);
      return mapStaffMember(row as Record<string, unknown>, patientIds);
    });
    set({ staffMembers });
  },

  inviteStaff: async (email, fullName, role) => {
    const clinicId   = get().clinicId;
    const clinicName = get().clinicName;
    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, role, clinicId, clinicName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Invite failed');
  },

  updateStaff: async (id, updates) => {
    const supabase = createClient();
    const dbUpdates: Record<string, unknown> = {};
    if (updates.fullName  !== undefined) dbUpdates.full_name  = updates.fullName;
    if (updates.role      !== undefined) dbUpdates.role       = updates.role;
    if (updates.phone     !== undefined) dbUpdates.phone      = updates.phone;
    if (updates.jobTitle  !== undefined) dbUpdates.job_title  = updates.jobTitle;
    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
    if (error) throw error;
    set((state) => ({
      staffMembers: state.staffMembers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },

  removeStaff: async (id) => {
    const res = await fetch('/api/staff/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Remove failed');
    set((state) => ({ staffMembers: state.staffMembers.filter((s) => s.id !== id) }));
  },

  assignPatient: async (staffId, patientId) => {
    const supabase  = createClient();
    const clinicId  = get().clinicId;
    const { error } = await supabase
      .from('staff_patient_assignments')
      .insert({ staff_id: staffId, patient_id: patientId, clinic_id: clinicId });
    if (error) throw error;
    set((state) => ({
      staffMembers: state.staffMembers.map((s) =>
        s.id === staffId
          ? { ...s, assignedPatientIds: [...s.assignedPatientIds, patientId] }
          : s
      ),
    }));
  },

  unassignPatient: async (staffId, patientId) => {
    const supabase  = createClient();
    const { error } = await supabase
      .from('staff_patient_assignments')
      .delete()
      .eq('staff_id', staffId)
      .eq('patient_id', patientId);
    if (error) throw error;
    set((state) => ({
      staffMembers: state.staffMembers.map((s) =>
        s.id === staffId
          ? { ...s, assignedPatientIds: s.assignedPatientIds.filter((pid) => pid !== patientId) }
          : s
      ),
    }));
  },

  // ─── Daily Care Records ────────────────────────────────────────────────────

  dailyCareRecords: [],

  fetchDailyCareRecords: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_care_records')
      .select('*, patients(first_name, last_name)')
      .order('date', { ascending: false });
    if (error) throw error;
    set({ dailyCareRecords: (data ?? []).map(mapDailyCareRecord) });
  },

  addDailyCareRecord: async (record) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_care_records')
      .insert({ ...dailyCareRecordToDb(record), clinic_id: get().clinicId })
      .select('*, patients(first_name, last_name)')
      .single();
    if (error) throw error;
    set((state) => ({ dailyCareRecords: [mapDailyCareRecord(data), ...state.dailyCareRecords] }));
  },

  updateDailyCareRecord: async (id, record) => {
    const supabase = createClient();
    const existing = get().dailyCareRecords.find((r) => r.id === id);
    if (!existing) return;
    const merged = { ...existing, ...record };
    const { patientName: _, ...rest } = merged;
    const { data, error } = await supabase
      .from('daily_care_records')
      .update(dailyCareRecordToDb(rest))
      .eq('id', id)
      .select('*, patients(first_name, last_name)')
      .single();
    if (error) throw error;
    set((state) => ({
      dailyCareRecords: state.dailyCareRecords.map((r) => (r.id === id ? mapDailyCareRecord(data) : r)),
    }));
  },

  deleteDailyCareRecord: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('daily_care_records').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ dailyCareRecords: state.dailyCareRecords.filter((r) => r.id !== id) }));
  },

  // ─── Care Plans ────────────────────────────────────────────────────────────

  carePlans: [],

  fetchCarePlans: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('care_plans')
      .select('*, patients(first_name, last_name), care_plan_tasks(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    set({ carePlans: (data ?? []).map(mapCarePlan) });
  },

  addCarePlan: async (plan, tasks) => {
    const supabase = createClient();
    const clinicId = get().clinicId;

    const { data: newPlan, error: planError } = await supabase
      .from('care_plans')
      .insert({
        clinic_id: clinicId,
        patient_id: plan.patientId,
        title: plan.title,
        description: plan.description,
        goals: plan.goals,
        carer_name: plan.carerName,
        status: plan.status,
        start_date: plan.startDate || null,
        end_date: plan.endDate || null,
        notes: plan.notes,
      })
      .select('*, patients(first_name, last_name)')
      .single();
    if (planError) throw planError;

    if (tasks.length > 0) {
      const { error: tasksError } = await supabase.from('care_plan_tasks').insert(
        tasks.map((t) => ({
          care_plan_id: newPlan.id,
          clinic_id: clinicId,
          title: t.title,
          description: t.description,
          due_date: t.dueDate || null,
          status: 'pending',
        }))
      );
      if (tasksError) throw tasksError;
    }

    // Re-fetch to get tasks embedded
    const { data: full, error: fetchError } = await supabase
      .from('care_plans')
      .select('*, patients(first_name, last_name), care_plan_tasks(*)')
      .eq('id', newPlan.id)
      .single();
    if (fetchError) throw fetchError;

    set((state) => ({ carePlans: [mapCarePlan(full), ...state.carePlans] }));
  },

  updateCarePlan: async (id, plan) => {
    const supabase = createClient();
    const updates: Record<string, unknown> = {};
    if (plan.title !== undefined) updates.title = plan.title;
    if (plan.description !== undefined) updates.description = plan.description;
    if (plan.goals !== undefined) updates.goals = plan.goals;
    if (plan.carerName !== undefined) updates.carer_name = plan.carerName;
    if (plan.status !== undefined) updates.status = plan.status;
    if (plan.startDate !== undefined) updates.start_date = plan.startDate || null;
    if (plan.endDate !== undefined) updates.end_date = plan.endDate || null;
    if (plan.notes !== undefined) updates.notes = plan.notes;

    const { data, error } = await supabase
      .from('care_plans')
      .update(updates)
      .eq('id', id)
      .select('*, patients(first_name, last_name), care_plan_tasks(*)')
      .single();
    if (error) throw error;
    set((state) => ({
      carePlans: state.carePlans.map((cp) => (cp.id === id ? mapCarePlan(data) : cp)),
    }));
  },

  deleteCarePlan: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('care_plans').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ carePlans: state.carePlans.filter((cp) => cp.id !== id) }));
  },

  updateCarePlanTask: async (taskId, status) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('care_plan_tasks')
      .update({ status })
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    set((state) => ({
      carePlans: state.carePlans.map((cp) => ({
        ...cp,
        tasks: cp.tasks.map((t) => (t.id === taskId ? mapCarePlanTask(data) : t)),
      })),
    }));
  },

  // ─── Search ────────────────────────────────────────────────────────────────

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
