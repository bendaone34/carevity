'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function StoreInitializer() {
  const { fetchPatients, fetchAppointments, fetchMedicalRecords } = useStore();

  useEffect(() => {
    fetchPatients();
    fetchAppointments();
    fetchMedicalRecords();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
