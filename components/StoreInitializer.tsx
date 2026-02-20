'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

export default function StoreInitializer() {
  const {
    fetchPatients, fetchAppointments, fetchMedicalRecords,
    fetchCarePlans, fetchDailyCareRecords, fetchStaff,
    setLoading, setClinic, setCurrentUserRole,
  } = useStore();

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.user_metadata?.clinic_id) {
        setClinic(user.user_metadata.clinic_id, user.user_metadata.clinic_name ?? '');
      }

      // Load current user's role from profiles
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role) setCurrentUserRole(profile.role as 'admin' | 'manager' | 'carer');
      }

      setLoading(true);
      await Promise.all([
        fetchPatients(), fetchAppointments(), fetchMedicalRecords(),
        fetchCarePlans(), fetchDailyCareRecords(), fetchStaff(),
      ]).finally(() => setLoading(false));
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
