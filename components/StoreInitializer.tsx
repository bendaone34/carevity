'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const FETCH_LABELS: [() => Promise<void>, string][] = [];

export default function StoreInitializer() {
  const {
    fetchPatients, fetchAppointments, fetchMedicalRecords,
    fetchCarePlans, fetchDailyCareRecords, fetchStaff,
    fetchMedications, fetchMedicationLogs, fetchIncidents,
    fetchOrganisation, fetchShifts, fetchWellbeingAlerts,
    setLoading, setClinic, setCurrentUserRole,
  } = useStore();

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.user_metadata?.clinic_id) {
          setClinic(user.user_metadata.clinic_id, user.user_metadata.clinic_name ?? '');
        }

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile?.role) setCurrentUserRole(profile.role as 'admin' | 'manager' | 'carer');
        }

        setLoading(true);

        // Use allSettled so a single failed fetch does not abort the rest.
        // Each domain is labelled so we can surface a specific error message.
        const tasks: [() => Promise<void>, string][] = [
          [fetchPatients,         'patients'],
          [fetchAppointments,     'appointments'],
          [fetchMedicalRecords,   'medical records'],
          [fetchCarePlans,        'care plans'],
          [fetchDailyCareRecords, 'daily care records'],
          [fetchStaff,            'staff'],
          [fetchMedications,      'medications'],
          [fetchMedicationLogs,   'medication logs'],
          [fetchIncidents,        'incidents'],
          [fetchOrganisation,     'organisation'],
          [fetchShifts,           'shifts'],
          [fetchWellbeingAlerts,  'wellbeing alerts'],
        ];

        const results = await Promise.allSettled(tasks.map(([fn]) => fn()));

        const failed = results
          .map((r, i) => (r.status === 'rejected' ? tasks[i][1] : null))
          .filter(Boolean) as string[];

        if (failed.length > 0) {
          toast.error(`Failed to load: ${failed.join(', ')}. Please refresh.`);
        }
      } catch {
        toast.error('Failed to initialise. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
