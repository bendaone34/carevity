'use client';

import { useMemo } from 'react';
import { subDays, format, startOfWeek, differenceInCalendarDays, differenceInHours, parseISO } from 'date-fns';
import { useStore } from '@/lib/store';

export interface ReportData {
  totalPatients: number;
  activeCarePlans: number;
  recordsThisWeek: number;
  staffOnDutyToday: number;

  dailyRecordVolume: Array<{ date: string; isoDate: string; count: number }>;
  completionRate:    Array<{ date: string; isoDate: string; rate: number }>;
  avgMoodByDay:      Array<{ date: string; isoDate: string; avg: number }>;
  recordsByCarer:    Array<{ carer: string; count: number }>;

  atRiskPatients: Array<{
    id: string;
    name: string;
    lastRecordDate: string | null;
    hoursAgo: number | null;
  }>;
  overdueTasksWithPlans: Array<{
    taskId: string;
    taskTitle: string;
    taskStatus: 'pending' | 'in_progress';
    dueDate: string;
    daysOverdue: number;
    patientName: string;
    carePlanTitle: string;
  }>;

  generatedAt: string;
  isLoading: boolean;
}

export function useReportData(): ReportData {
  const patients         = useStore((s) => s.patients);
  const carePlans        = useStore((s) => s.carePlans);
  const dailyCareRecords = useStore((s) => s.dailyCareRecords);
  const isLoading        = useStore((s) => s.isLoading);

  return useMemo(() => {
    const now          = new Date();
    const todayISO     = format(now, 'yyyy-MM-dd');
    const weekStartISO = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const cutoff48hISO = format(subDays(now, 2), 'yyyy-MM-dd');
    const last14Days   = Array.from({ length: 14 }, (_, i) => subDays(now, 13 - i));
    const last30Days   = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));

    // ── Overview stats ────────────────────────────────────────────────────────
    const totalPatients  = patients.length;
    const activeCarePlans = carePlans.filter((cp) => cp.status === 'active').length;
    const recordsThisWeek = dailyCareRecords.filter((r) => r.date >= weekStartISO && r.date <= todayISO).length;

    const todayRecords = dailyCareRecords.filter((r) => r.date === todayISO);
    const staffOnDutyToday = new Set(todayRecords.map((r) => r.carerName)).size;

    // ── dailyRecordVolume (last 14 days) ──────────────────────────────────────
    const volumeMap = new Map<string, number>();
    for (const r of dailyCareRecords) {
      volumeMap.set(r.date, (volumeMap.get(r.date) ?? 0) + 1);
    }
    const dailyRecordVolume = last14Days.map((day) => {
      const isoDate = format(day, 'yyyy-MM-dd');
      return { date: format(day, 'MMM d'), isoDate, count: volumeMap.get(isoDate) ?? 0 };
    });

    // ── completionRate (last 30 days) ─────────────────────────────────────────
    // Rate = unique patients recorded that day / total patients * 100
    const coveredMap = new Map<string, Set<string>>();
    for (const r of dailyCareRecords) {
      if (!coveredMap.has(r.date)) coveredMap.set(r.date, new Set());
      coveredMap.get(r.date)!.add(r.patientId);
    }
    const completionRate = last30Days.map((day) => {
      const isoDate = format(day, 'yyyy-MM-dd');
      const covered = coveredMap.get(isoDate)?.size ?? 0;
      const rate = totalPatients > 0 ? Math.round((covered / totalPatients) * 100) : 0;
      return { date: format(day, 'MMM d'), isoDate, rate };
    });

    // ── avgMoodByDay (last 30 days) ───────────────────────────────────────────
    const moodMap = new Map<string, number[]>();
    for (const r of dailyCareRecords) {
      if (r.moodScore > 0) {
        if (!moodMap.has(r.date)) moodMap.set(r.date, []);
        moodMap.get(r.date)!.push(r.moodScore);
      }
    }
    const avgMoodByDay = last30Days.map((day) => {
      const isoDate = format(day, 'yyyy-MM-dd');
      const scores  = moodMap.get(isoDate) ?? [];
      const avg     = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;
      return { date: format(day, 'MMM d'), isoDate, avg };
    });

    // ── recordsByCarer ────────────────────────────────────────────────────────
    const carerMap = new Map<string, number>();
    for (const r of dailyCareRecords) {
      const name = r.carerName?.trim() || 'Unknown';
      carerMap.set(name, (carerMap.get(name) ?? 0) + 1);
    }
    const recordsByCarer = Array.from(carerMap.entries())
      .map(([carer, count]) => ({ carer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── atRiskPatients ────────────────────────────────────────────────────────
    // Patients whose most recent record date is before 48h ago (or no record at all)
    const latestRecordByPatient = new Map<string, string>(); // patientId → isoDate
    for (const r of dailyCareRecords) {
      const existing = latestRecordByPatient.get(r.patientId);
      if (!existing || r.date > existing) {
        latestRecordByPatient.set(r.patientId, r.date);
      }
    }
    const atRiskPatients = patients
      .filter((p) => {
        const lastDate = latestRecordByPatient.get(p.id) ?? null;
        return lastDate === null || lastDate < cutoff48hISO;
      })
      .map((p) => {
        const lastRecordDate = latestRecordByPatient.get(p.id) ?? null;
        const hoursAgo = lastRecordDate
          ? differenceInHours(now, parseISO(lastRecordDate))
          : null;
        return {
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          lastRecordDate,
          hoursAgo,
        };
      });

    // ── overdueTasksWithPlans ─────────────────────────────────────────────────
    const overdueTasksWithPlans = carePlans.flatMap((cp) =>
      cp.tasks
        .filter(
          (t) =>
            t.dueDate !== undefined &&
            t.status !== 'completed' &&
            (t.status === 'pending' || t.status === 'in_progress') &&
            t.dueDate < todayISO
        )
        .map((t) => ({
          taskId: t.id,
          taskTitle: t.title,
          taskStatus: t.status as 'pending' | 'in_progress',
          dueDate: t.dueDate!,
          daysOverdue: differenceInCalendarDays(now, parseISO(t.dueDate!)),
          patientName: cp.patientName,
          carePlanTitle: cp.title,
        }))
    );

    return {
      totalPatients,
      activeCarePlans,
      recordsThisWeek,
      staffOnDutyToday,
      dailyRecordVolume,
      completionRate,
      avgMoodByDay,
      recordsByCarer,
      atRiskPatients,
      overdueTasksWithPlans,
      generatedAt: format(now, 'PPpp'),
      isLoading,
    };
  }, [patients, carePlans, dailyCareRecords, isLoading]);
}
