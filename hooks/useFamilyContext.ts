'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface FamilyContext {
  familyMemberId: string;
  patientId: string;
  clinicId: string;
  residentName: string;
  memberName: string;
  memberEmail: string;
}

export function useFamilyContext() {
  const [context, setContext] = useState<FamilyContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !user.user_metadata?.is_family_member) {
        router.replace('/family/login');
        return;
      }

      const meta = user.user_metadata;
      setContext({
        familyMemberId: meta.family_member_id ?? '',
        patientId:      meta.patient_id       ?? '',
        clinicId:       meta.clinic_id        ?? '',
        residentName:   meta.resident_name    ?? '',
        memberName:     meta.full_name        ?? '',
        memberEmail:    user.email            ?? '',
      });
      setIsLoading(false);
    }

    load();
  }, [router]);

  return { context, isLoading };
}
