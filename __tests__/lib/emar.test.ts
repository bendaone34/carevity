import { describe, it, expect } from 'vitest';
import {
  computeSchedule, isScheduledOn, londonDate, londonTime, londonDayStartISO, parseDoseTimes, doseTimesFor,
} from '@/lib/emar';
import type { Medication, MedicationLog } from '@/lib/types';

// Audit findings C4 (one log marked every dose of the day as given) and
// H7 (UTC dates vs local hours around midnight, frequency ignored).

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'm1', patientId: 'p1', patientName: 'Ada Lovelace', name: 'Amoxicillin',
    dosage: '500mg', frequency: 'three times daily', doseTimes: [], route: 'oral',
    prescribingDoctor: '', startDate: '2026-06-01', status: 'active', createdAt: '2026-06-01',
    ...overrides,
  };
}

function log(overrides: Partial<MedicationLog> = {}): MedicationLog {
  return {
    id: 'l1', medicationId: 'm1', patientId: 'p1', patientName: '', medicationName: '',
    date: '2026-07-01', time: '08:05', scheduledTime: '08:00', givenBy: 'Sam',
    refused: false, createdAt: '2026-07-01',
    ...overrides,
  };
}

// 1 July is BST (UTC+1)
const bst = (hhmm: string) => new Date(`2026-07-01T${hhmm}:00+01:00`);

function slotStatuses(meds: Medication[], logs: MedicationLog[], now: Date) {
  return computeSchedule(meds, logs, now, null).flatMap((g) =>
    g.slots.map((s) => `${s.time ?? 'PRN'} ${s.status}`),
  );
}

describe('UK time helpers', () => {
  it('uses the London date, not UTC, just after midnight in summer', () => {
    const t = new Date('2026-07-01T23:30:00Z'); // 00:30 BST on 2 July
    expect(londonDate(t)).toBe('2026-07-02');
    expect(londonTime(t)).toBe('00:30');
  });

  it('finds the UTC instant of London midnight for date filters', () => {
    expect(londonDayStartISO('2026-07-01')).toBe('2026-06-30T23:00:00.000Z'); // BST
    expect(londonDayStartISO('2026-01-15')).toBe('2026-01-15T00:00:00.000Z'); // GMT
  });

  it('matches UTC in winter (GMT)', () => {
    const t = new Date('2026-01-15T23:30:00Z');
    expect(londonDate(t)).toBe('2026-01-15');
    expect(londonTime(t)).toBe('23:30');
  });
});

describe('parseDoseTimes', () => {
  it('normalises, sorts and de-duplicates 24h times', () => {
    expect(parseDoseTimes('18:00, 8:00,13:00, 08:00')).toEqual(['08:00', '13:00', '18:00']);
  });

  it('rejects anything that is not a valid 24h time', () => {
    expect(parseDoseTimes('08:00, 25:00')).toBeNull();
    expect(parseDoseTimes('8am')).toBeNull();
  });

  it('returns an empty list for blank input', () => {
    expect(parseDoseTimes('  ')).toEqual([]);
  });
});

describe('doseTimesFor', () => {
  it('uses the prescribed times when set', () => {
    expect(doseTimesFor(med({ doseTimes: ['09:00', '21:00'] }))).toEqual(['09:00', '21:00']);
  });

  it('falls back to standard round times for the frequency', () => {
    expect(doseTimesFor(med({ frequency: 'four times daily' }))).toEqual(['08:00', '12:00', '16:00', '20:00']);
    expect(doseTimesFor(med({ frequency: 'as needed' }))).toEqual([]);
  });
});

describe('isScheduledOn', () => {
  it('excludes medication before its start date, after its end date, or discontinued', () => {
    expect(isScheduledOn(med({ startDate: '2026-07-02' }), '2026-07-01')).toBe(false);
    expect(isScheduledOn(med({ endDate: '2026-06-30' }), '2026-07-01')).toBe(false);
    expect(isScheduledOn(med({ endDate: '2026-07-01' }), '2026-07-01')).toBe(true);
    expect(isScheduledOn(med({ status: 'discontinued' }), '2026-07-01')).toBe(false);
  });

  it('schedules weekly medication only on the start weekday', () => {
    const weekly = med({ frequency: 'weekly', startDate: '2026-06-24' }); // a Wednesday
    expect(isScheduledOn(weekly, '2026-07-01')).toBe(true);  // Wednesday
    expect(isScheduledOn(weekly, '2026-07-02')).toBe(false); // Thursday
  });

  it('schedules monthly medication on the start day, clamped to short months', () => {
    const monthly = med({ frequency: 'monthly', startDate: '2026-01-31' });
    expect(isScheduledOn(monthly, '2026-02-28')).toBe(true);
    expect(isScheduledOn(monthly, '2026-03-31')).toBe(true);
    expect(isScheduledOn(monthly, '2026-03-30')).toBe(false);
  });
});

describe('computeSchedule', () => {
  it('tracks each dose of a three-times-daily medicine separately (C4)', () => {
    expect(slotStatuses([med()], [log()], bst('13:30'))).toEqual([
      '08:00 given', '13:00 due', '18:00 upcoming',
    ]);
  });

  it('marks a dose overdue once its window has passed', () => {
    expect(slotStatuses([med()], [log()], bst('14:00'))).toContain('13:00 due');
    expect(slotStatuses([med()], [log()], bst('14:01'))).toContain('13:00 overdue');
  });

  it('opens the window an hour before the dose', () => {
    expect(slotStatuses([med()], [], bst('06:59'))[0]).toBe('08:00 upcoming');
    expect(slotStatuses([med()], [], bst('07:00'))[0]).toBe('08:00 due');
  });

  it("ignores yesterday's logs", () => {
    expect(slotStatuses([med()], [log({ date: '2026-06-30' })], bst('13:30'))[0]).toBe('08:00 overdue');
  });

  it('shows refused, but a later administration in the same slot wins', () => {
    const refused = log({ id: 'r', refused: true });
    expect(slotStatuses([med()], [refused], bst('08:30'))[0]).toBe('08:00 refused');
    expect(slotStatuses([med()], [refused, log({ id: 'g' })], bst('08:30'))[0]).toBe('08:00 given');
  });

  it('attributes legacy logs without a slot to the nearest dose time', () => {
    const legacy = log({ scheduledTime: undefined, time: '12:50' });
    expect(slotStatuses([med()], [legacy], bst('13:30'))).toEqual([
      '08:00 overdue', '13:00 given', '18:00 upcoming',
    ]);
  });

  it('uses the London date around midnight', () => {
    // 00:30 BST on 2 July: yesterday's 20:00 dose must not count for today
    const bd = med({ frequency: 'twice daily' });
    const lastNight = log({ date: '2026-07-01', scheduledTime: '20:00', time: '20:00' });
    expect(slotStatuses([bd], [lastNight], new Date('2026-07-01T23:30:00Z'))).toEqual([
      '08:00 upcoming', '20:00 upcoming',
    ]);
  });

  it('lists as-needed medication once with no dose time', () => {
    expect(slotStatuses([med({ frequency: 'as needed' })], [], bst('10:00'))).toEqual(['PRN as-needed']);
  });

  it('shows carers only their assigned residents', () => {
    const meds = [med(), med({ id: 'm2', patientId: 'p2', patientName: 'Bob' })];
    const groups = computeSchedule(meds, [], bst('10:00'), ['p2']);
    expect(groups.map((g) => g.patientName)).toEqual(['Bob']);
  });

  it('skips medication not scheduled today', () => {
    expect(computeSchedule([med({ endDate: '2026-06-30' })], [], bst('10:00'), null)).toEqual([]);
  });
});
