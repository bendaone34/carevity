import { describe, it, expect, vi, beforeEach } from 'vitest';

// Exercises the real store action. A dose log must carry its dose slot and a
// per-attempt idempotency key; a retried request is a success, a second
// "given" for the same slot is a clear error (audit findings C4 / M6).

const single = vi.fn();
const order = vi.fn();
const insert = vi.fn();
const supabase = {
  from: vi.fn(() => ({
    insert: (row: unknown) => {
      insert(row);
      return { select: () => ({ single }) };
    },
    select: () => ({ order }),
  })),
};

vi.mock('@/lib/supabase/client', () => ({ createClient: () => supabase }));

const { useStore } = await import('@/lib/store');

const newLog = {
  medicationId:    'm1',
  patientId:       'p1',
  date:            '2026-07-01',
  time:            '13:05',
  scheduledTime:   '13:00',
  givenBy:         'ignored — stamped by the database',
  refused:         false,
  clientRequestId: '6f1c1f6e-9d7e-4b0a-8b8e-2f4f6d2d1a11',
};

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({ clinicId: 'c1', medicationLogs: [] });
});

describe('addMedicationLog', () => {
  it('sends the dose slot and idempotency key', async () => {
    single.mockResolvedValue({
      data: { id: 'l1', medication_id: 'm1', patient_id: 'p1', date: '2026-07-01', time: '13:05',
              scheduled_time: '13:00', given_by: 'Sam', given_by_id: 'u1', refused: false, created_at: '' },
      error: null,
    });

    await useStore.getState().addMedicationLog(newLog);

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: 'c1',
      medication_id: 'm1',
      scheduled_time: '13:00',
      client_request_id: newLog.clientRequestId,
    }));
    expect(useStore.getState().medicationLogs[0]).toMatchObject({
      scheduledTime: '13:00', givenById: 'u1', givenBy: 'Sam',
    });
  });

  it('treats a retried request (same idempotency key) as success', async () => {
    single.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "medication_logs_client_request_id_key"' },
    });
    order.mockResolvedValue({ data: [], error: null });

    await expect(useStore.getState().addMedicationLog(newLog)).resolves.toBeUndefined();
    expect(order).toHaveBeenCalled(); // re-fetched to show the saved row
  });

  it('refuses a second administration of the same dose', async () => {
    single.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "medication_logs_one_given_per_slot"' },
    });

    await expect(useStore.getState().addMedicationLog(newLog)).rejects.toThrow(
      'This dose has already been recorded as given',
    );
  });
});
