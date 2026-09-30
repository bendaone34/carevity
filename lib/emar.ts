import type { Medication, MedicationLog } from '@/lib/types';

// ── eMAR schedule logic ──────────────────────────────────────────────────────
// Pure functions so the medication round is testable. All dates and times are
// in the care home's timezone — never derive "today" from toISOString(), which
// is UTC and rolls over an hour early during BST.

export const CARE_HOME_TZ = 'Europe/London';

/** Minutes either side of a dose time during which it shows as "due". */
export const DOSE_WINDOW_MIN = 60;

/** Standard round times used when a medication has no prescribed dose times. */
export const DEFAULT_DOSE_TIMES: Record<string, string[]> = {
  'once daily':        ['08:00'],
  'twice daily':       ['08:00', '20:00'],
  'three times daily': ['08:00', '13:00', '18:00'],
  'four times daily':  ['08:00', '12:00', '16:00', '20:00'],
  'weekly':            ['08:00'],
  'monthly':           ['08:00'],
  'as needed':         [],
};

export type DoseStatus = 'given' | 'refused' | 'due' | 'overdue' | 'upcoming' | 'as-needed';

export interface DoseSlot {
  medication: Medication;
  /** HH:MM, or null for as-needed (PRN) medication */
  time: string | null;
  status: DoseStatus;
  logs: MedicationLog[];
}

export interface ScheduleGroup {
  patientId: string;
  patientName: string;
  slots: DoseSlot[];
}

function londonParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CARE_HOME_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { y: get('year'), m: get('month'), d: get('day'), hh: get('hour'), mm: get('minute') };
}

/** YYYY-MM-DD in the care home's timezone. */
export function londonDate(now: Date): string {
  const { y, m, d } = londonParts(now);
  return `${y}-${m}-${d}`;
}

/** HH:MM (24h) in the care home's timezone. */
export function londonTime(now: Date): string {
  const { hh, mm } = londonParts(now);
  return `${hh}:${mm}`;
}

/** UTC ISO timestamp of 00:00 London time on the given YYYY-MM-DD. */
export function londonDayStartISO(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const utcMidnight = new Date(Date.UTC(y, m - 1, d));
  // London is UTC+0 or UTC+1, so local midnight is at UTC midnight or an hour before
  const offsetHours = Number(londonTime(utcMidnight).slice(0, 2));
  return new Date(utcMidnight.getTime() - offsetHours * 3_600_000).toISOString();
}

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Parses "8:00, 13:00" into sorted, de-duplicated ["08:00", "13:00"].
 * Returns null if any entry is not a valid 24h time.
 */
export function parseDoseTimes(input: string): string[] | null {
  const entries = input.split(',').map((s) => s.trim()).filter(Boolean);
  const times: string[] = [];
  for (const entry of entries) {
    const match = HHMM.exec(entry);
    if (!match) return null;
    times.push(`${match[1].padStart(2, '0')}:${match[2]}`);
  }
  return Array.from(new Set(times)).sort();
}

/** Prescribed dose times, falling back to standard round times. */
export function doseTimesFor(med: Medication): string[] {
  if (med.doseTimes?.length) return [...med.doseTimes].sort();
  return DEFAULT_DOSE_TIMES[med.frequency] ?? ['08:00'];
}

function parseISODate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** Whether the medication is due at all on the given YYYY-MM-DD. */
export function isScheduledOn(med: Medication, date: string): boolean {
  if (med.status !== 'active') return false;
  if (med.startDate && date < med.startDate) return false;
  if (med.endDate && date > med.endDate) return false;

  if (med.frequency === 'weekly') {
    return parseISODate(date).weekday === parseISODate(med.startDate).weekday;
  }
  if (med.frequency === 'monthly') {
    const day = parseISODate(date);
    const daysInMonth = new Date(Date.UTC(day.y, day.m, 0)).getUTCDate();
    return day.d === Math.min(parseISODate(med.startDate).d, daysInMonth);
  }
  return true;
}

/** Slot a log belongs to: its recorded slot, else the nearest dose time (legacy rows). */
function slotFor(log: MedicationLog, times: string[]): string {
  if (log.scheduledTime && times.includes(log.scheduledTime)) return log.scheduledTime;
  const at = toMinutes(log.time);
  return times.reduce((best, t) =>
    Math.abs(toMinutes(t) - at) < Math.abs(toMinutes(best) - at) ? t : best,
  );
}

function statusFor(logs: MedicationLog[], time: string, nowMin: number): DoseStatus {
  if (logs.some((l) => !l.refused)) return 'given';
  if (logs.some((l) => l.refused)) return 'refused';
  const due = toMinutes(time);
  if (nowMin < due - DOSE_WINDOW_MIN) return 'upcoming';
  if (nowMin <= due + DOSE_WINDOW_MIN) return 'due';
  return 'overdue';
}

/**
 * Today's medication round: one slot per scheduled dose, grouped by resident.
 * `assignedIds` limits carers to their residents; null means all residents.
 */
export function computeSchedule(
  medications: Medication[],
  logs: MedicationLog[],
  now: Date,
  assignedIds: string[] | null,
): ScheduleGroup[] {
  const today = londonDate(now);
  const nowMin = toMinutes(londonTime(now));
  const groups = new Map<string, ScheduleGroup>();

  for (const med of medications) {
    if (assignedIds !== null && !assignedIds.includes(med.patientId)) continue;
    if (!isScheduledOn(med, today)) continue;

    const todaysLogs = logs.filter((l) => l.medicationId === med.id && l.date === today);
    const times = doseTimesFor(med);
    let slots: DoseSlot[];

    if (times.length === 0) {
      slots = [{ medication: med, time: null, status: 'as-needed', logs: todaysLogs }];
    } else {
      slots = times.map((time) => {
        const slotLogs = todaysLogs.filter((l) => slotFor(l, times) === time);
        return { medication: med, time, status: statusFor(slotLogs, time, nowMin), logs: slotLogs };
      });
    }

    const group = groups.get(med.patientId)
      ?? { patientId: med.patientId, patientName: med.patientName, slots: [] };
    group.slots.push(...slots);
    groups.set(med.patientId, group);
  }

  const result = Array.from(groups.values());
  for (const g of result) {
    g.slots.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')
      || a.medication.name.localeCompare(b.medication.name));
  }
  return result.sort((a, b) => a.patientName.localeCompare(b.patientName));
}
