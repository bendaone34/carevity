import { describe, it, expect, vi } from 'vitest';

// fetchStaff referenced an undefined `assignments` variable (regression from
// 99e2515), so it always threw: the staff list never loaded and carers got no
// assignedPatientIds — an empty medication round.

const results: Record<string, unknown> = {
  profiles: {
    data: [{ id: 'carer-1', full_name: 'Sam', role: 'carer', email: 's@x', created_at: '' }],
    error: null,
  },
  staff_patient_assignments: {
    data: [
      { staff_id: 'carer-1', patient_id: 'p1' },
      { staff_id: 'carer-1', patient_id: 'p2' },
      { staff_id: 'someone-else', patient_id: 'p3' },
    ],
    error: null,
  },
};

const supabase = {
  from: (table: string) => {
    const result = Promise.resolve(results[table]);
    return { select: () => Object.assign(result, { order: () => result }) };
  },
};

vi.mock('@/lib/supabase/client', () => ({ createClient: () => supabase }));

const { useStore } = await import('@/lib/store');

describe('fetchStaff', () => {
  it('loads staff with their assigned residents', async () => {
    await useStore.getState().fetchStaff();
    const [carer] = useStore.getState().staffMembers;
    expect(carer.id).toBe('carer-1');
    expect(carer.assignedPatientIds).toEqual(['p1', 'p2']);
  });
});
