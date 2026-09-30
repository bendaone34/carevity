import { describe, it, expect } from 'vitest';
import { mapAuditRow, describeAuditEntry, formatAuditValue } from '@/lib/audit';

// Turns raw audit_log rows into entries a CQC inspector can read.

const base = {
  id: 42,
  at: '2026-09-30T08:15:00Z',
  clinic_id: 'c1',
  patient_id: 'p1',
  row_id: 'r1',
  actor_id: 'u1',
  actor_name: 'Sam Jones',
  old_data: null,
  new_data: null,
  changed_fields: null,
};

describe('mapAuditRow', () => {
  it('lists only the changed fields for an update, with before and after values', () => {
    const entry = mapAuditRow({
      ...base,
      table_name: 'daily_care_records',
      action: 'UPDATE',
      old_data: { id: 'r1', mood_score: 3, notes: 'Settled', created_at: 'x' },
      new_data: { id: 'r1', mood_score: 2, notes: 'Settled', created_at: 'x' },
      changed_fields: ['mood_score'],
    });
    expect(entry.changes).toEqual([{ field: 'mood_score', label: 'Mood score', before: 3, after: 2 }]);
    expect(entry.recordLabel).toBe('daily care note');
  });

  it('shows the full new record for an insert and the removed record for a delete', () => {
    const inserted = mapAuditRow({
      ...base, table_name: 'incidents', action: 'INSERT',
      new_data: { id: 'r1', clinic_id: 'c1', severity: 'high', description: 'Fall in lounge' },
    });
    expect(inserted.changes).toEqual([
      { field: 'description', label: 'Description', before: null, after: 'Fall in lounge' },
      { field: 'severity', label: 'Severity', before: null, after: 'high' },
    ]);

    const deleted = mapAuditRow({
      ...base, table_name: 'medications', action: 'DELETE',
      old_data: { id: 'r1', name: 'Warfarin' },
    });
    expect(deleted.changes).toEqual([{ field: 'name', label: 'Name', before: 'Warfarin', after: null }]);
  });

  it('hides internal identifiers that mean nothing to a reader', () => {
    const entry = mapAuditRow({
      ...base, table_name: 'medication_logs', action: 'INSERT',
      new_data: { id: 'r1', clinic_id: 'c1', patient_id: 'p1', medication_id: 'm1', given_by_id: 'u1',
                  client_request_id: 'k', created_at: 'x', refused: false },
    });
    expect(entry.changes.map((c) => c.field)).toEqual(['refused']);
  });
});

describe('describeAuditEntry', () => {
  it('reads as a sentence', () => {
    const entry = mapAuditRow({ ...base, table_name: 'daily_care_records', action: 'UPDATE', changed_fields: ['notes'],
      old_data: { notes: 'a' }, new_data: { notes: 'b' } });
    expect(describeAuditEntry(entry, 'Ada Lovelace')).toBe('Sam Jones edited a daily care note for Ada Lovelace');
  });

  it('attributes changes with no signed-in user to the system', () => {
    const entry = mapAuditRow({ ...base, actor_id: null, actor_name: null, table_name: 'wellbeing_alerts', action: 'INSERT', new_data: {} });
    expect(describeAuditEntry(entry, null)).toBe('System created a wellbeing alert');
  });
});

describe('formatAuditValue', () => {
  it('formats values for display', () => {
    expect(formatAuditValue(null)).toBe('—');
    expect(formatAuditValue(true)).toBe('Yes');
    expect(formatAuditValue(false)).toBe('No');
    expect(formatAuditValue(['08:00', '20:00'])).toBe('08:00, 20:00');
    expect(formatAuditValue({ eaten: true })).toBe('{"eaten":true}');
  });
});
