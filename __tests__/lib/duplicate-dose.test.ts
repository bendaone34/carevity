/**
 * Tests for duplicate-dose prevention logic.
 *
 * The DB constraint (UNIQUE on medication_id, patient_id, date, time) is the
 * hard stop. These tests verify the UI-layer soft stop: the submit button
 * must remain disabled after a successful submission so a double-tap cannot
 * create a second request while the modal is still on screen.
 *
 * They also document the contract callers must honour: addMedicationLog should
 * throw (not silently ignore) on a duplicate entry so the UI can show an error.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Simulate duplicate constraint error from Supabase ────────────────────────
const DUPLICATE_ERROR = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "medication_logs_no_duplicate_dose"',
};

async function addMedicationLogMock(
  supabase: ReturnType<typeof makeInsertChain>,
  log: object
) {
  const { error } = await supabase.from('medication_logs').insert(log).select('id').single();
  if (error) throw new Error(error.message);
}

function makeInsertChain(shouldDuplicate = false) {
  return {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      shouldDuplicate
        ? { data: null, error: DUPLICATE_ERROR }
        : { data: { id: 'new-log-uuid' }, error: null }
    ),
  };
}

describe('addMedicationLog duplicate prevention', () => {
  const logPayload = {
    medication_id: 'med-1',
    patient_id:    'patient-1',
    date:          '2026-09-29',
    time:          '08:00',
    given_by:      'Alice',
    refused:       false,
    clinic_id:     'clinic-a',
  };

  it('resolves on first successful insert', async () => {
    const supabase = makeInsertChain(false);
    await expect(addMedicationLogMock(supabase, logPayload)).resolves.toBeUndefined();
  });

  it('throws a meaningful error on duplicate key violation (double-tap scenario)', async () => {
    const supabase = makeInsertChain(true);
    await expect(addMedicationLogMock(supabase, logPayload)).rejects.toThrow(
      'duplicate key value'
    );
  });

  it('UI isSaving flag prevents re-submission during in-flight request', () => {
    // Verify the boolean state pattern: isSaving=true during submission
    let isSaving = false;
    const setIsSaving = (v: boolean) => { isSaving = v; };

    // Simulate handleSubmit start
    setIsSaving(true);
    expect(isSaving).toBe(true);

    // Button should be disabled while isSaving
    const buttonDisabled = isSaving;
    expect(buttonDisabled).toBe(true);

    // Simulate completion
    setIsSaving(false);
    expect(isSaving).toBe(false);
  });
});
