export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  bloodType: string;
  allergies: string[];
  medicalConditions: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  avatar?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  type: 'checkup' | 'consultation' | 'follow-up' | 'emergency';
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  notes?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  diagnosis: string;
  treatment: string;
  prescriptions: string[];
  doctorName: string;
  notes?: string;
  vitals?: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    weight: number;
  };
}

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingRecords: number;
  completedToday: number;
}

export interface DailyCareRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  carerName: string;
  recordedAt?: string;
  meals: {
    breakfast: { eaten: boolean; notes: string };
    lunch:     { eaten: boolean; notes: string };
    dinner:    { eaten: boolean; notes: string };
    snacks: string;
    fluidsMl: number;
  };
  personalCare: {
    bathing:  boolean;
    grooming: boolean;
    dressing: boolean;
    oralCare: boolean;
    notes: string;
  };
  moodScore: number;
  moodNotes: string;
  activity:  string;
  incidents: string;
  notes:     string;
  createdAt: string;
}

export interface CarePlanTask {
  id: string;
  carePlanId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  createdAt: string;
}

export interface CarePlan {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  description?: string;
  goals: string[];
  carerName: string;
  status: 'active' | 'completed' | 'pending';
  startDate?: string;
  endDate?: string;
  notes?: string;
  tasks: CarePlanTask[];
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  patientName: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribingDoctor: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
  status: 'active' | 'discontinued';
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  date: string;
  time: string;
  givenBy: string;
  notes?: string;
  refused: boolean;
  createdAt: string;
}

export interface Incident {
  id: string;
  patientId: string;
  patientName: string;
  reportedBy: string;
  reportedById: string;
  date: string;
  time: string;
  incidentType: 'fall' | 'medication_error' | 'safeguarding' | 'behavioural' | 'accident' | 'near_miss' | 'other';
  location: string;
  description: string;
  immediateAction: string;
  witnesses: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  followUp: boolean;
  followUpNotes: string;
  status: 'open' | 'under_review' | 'resolved';
  internalNotes: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'manager' | 'carer';
  phone: string;
  jobTitle: string;
  assignedPatientIds: string[];
  createdAt: string;
  isOnboarded: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist';
  avatar?: string;
}