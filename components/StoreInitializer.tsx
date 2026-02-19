'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function StoreInitializer() {
  const { fetchPatients, fetchAppointments, fetchMedicalRecords, setLoading } = useStore();

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPatients(), fetchAppointments(), fetchMedicalRecords()])
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
