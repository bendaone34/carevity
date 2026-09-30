// ── Audit trail presentation ─────────────────────────────────────────────────
// Turns raw audit_log rows into entries a manager or CQC inspector can read.

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditChange {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
}

export interface AuditEntry {
  id: number;
  at: string;
  action: AuditAction;
  tableName: string;
  recordLabel: string;
  rowId: string | null;
  patientId: string | null;
  actorId: string | null;
  actorName: string | null;
  changes: AuditChange[];
}

export const AUDIT_RECORD_LABELS: Record<string, string> = {
  patients:                  'resident record',
  medical_records:           'medical record',
  care_plans:                'care plan',
  care_plan_tasks:           'care plan task',
  daily_care_records:        'daily care note',
  medications:               'medication',
  medication_logs:           'medication administration',
  incidents:                 'incident report',
  wellbeing_alerts:          'wellbeing alert',
  alert_acknowledgements:    'alert acknowledgement',
  appointments:              'appointment',
  profiles:                  'staff profile',
  staff_patient_assignments: 'resident assignment',
  family_members:            'family portal access',
  clinics:                   'organisation settings',
  clinic_join_links:         'staff invite link',
  visit_requests:            'visit request',
};

// Internal keys and bookkeeping that mean nothing to a reader
const HIDDEN_FIELDS = new Set([
  'id', 'clinic_id', 'patient_id', 'created_at', 'updated_at', 'client_request_id',
  'given_by_id', 'medication_id', 'care_plan_id', 'alert_id', 'token_hash',
  'reported_by_id', 'family_member_id', 'invited_by', 'created_by', 'user_id',
]);

const VERBS: Record<AuditAction, string> = {
  INSERT: 'created',
  UPDATE: 'edited',
  DELETE: 'deleted',
};

function fieldLabel(field: string): string {
  const words = field.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Json = Record<string, unknown> | null;

export function mapAuditRow(row: Record<string, unknown>): AuditEntry {
  const action = row.action as AuditAction;
  const oldData = (row.old_data as Json) ?? {};
  const newData = (row.new_data as Json) ?? {};

  const fields = action === 'UPDATE'
    ? ((row.changed_fields as string[] | null) ?? [])
    : Object.keys(action === 'INSERT' ? newData : oldData);

  const changes = fields
    .filter((f) => !HIDDEN_FIELDS.has(f))
    .sort()
    .map((field) => ({
      field,
      label:  fieldLabel(field),
      before: action === 'INSERT' ? null : oldData[field] ?? null,
      after:  action === 'DELETE' ? null : newData[field] ?? null,
    }));

  const tableName = row.table_name as string;
  return {
    id:          row.id as number,
    at:          row.at as string,
    action,
    tableName,
    recordLabel: AUDIT_RECORD_LABELS[tableName] ?? tableName.replace(/_/g, ' '),
    rowId:       (row.row_id as string | null) ?? null,
    patientId:   (row.patient_id as string | null) ?? null,
    actorId:     (row.actor_id as string | null) ?? null,
    actorName:   (row.actor_name as string | null) ?? null,
    changes,
  };
}

/** e.g. "Sam Jones edited a daily care note for Ada Lovelace" */
export function describeAuditEntry(entry: AuditEntry, patientName: string | null): string {
  const actor = entry.actorId ? (entry.actorName || 'Unknown user') : 'System';
  const article = /^[aeiou]/i.test(entry.recordLabel) ? 'an' : 'a';
  const subject = patientName ? ` for ${patientName}` : '';
  return `${actor} ${VERBS[entry.action]} ${article} ${entry.recordLabel}${subject}`;
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value) && value.every((v) => typeof v !== 'object')) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
