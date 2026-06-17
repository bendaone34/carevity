'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';
import { useRole } from '@/hooks/useRole';
import type { Appointment, Patient } from '@/lib/types';

interface Trend { value: number; isPositive: boolean }

export interface DashboardData {
  totalPatients: number;
  todayAppointments: number;
  pendingRecords: number;
  completedToday: number;
  trends: {
    totalPatients:     Trend | null;
    todayAppointments: Trend | null;
    completedToday:    Trend | null;
  };
  todayAppointmentsList: Appointment[];
  recentPatients: Patient[];
  isLoading: boolean;
}

function calcTrend(current: number, previous: number): Trend | null {
  if (previous === 0 || current === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), isPositive: pct >= 0 };
}

export function useDashboardStats(): DashboardData {
  const {
    patients, appointments, dailyCareRecords, staffMembers,
    fetchPatients, fetchAppointments, fetchDailyCareRecords,
    isLoading,
  } = useStore();
  const { isCarer } = useRole();

  const [userId, setUserId]   = useState<string | null>(null);
  const [trends, setTrends]   = useState<DashboardData['trends']>({
    totalPatients: null, todayAppointments: null, completedToday: null,
  });

  const today = new Date().toISOString().split('T')[0];

  // Resolve current user ID once on mount
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // ─── Role-aware filtering ───────────────────────────────────────────────────
  // null  → admin / manager → see everything
  // []    → carer with no assignments
  // [...] → carer with assigned patient IDs
  const assignedIds: string[] | null =
    isCarer && userId !== null
      ? (staffMembers.find(s => s.id === userId)?.assignedPatientIds ?? [])
      : null;

  const filteredPatients = assignedIds === null
    ? patients
    : patients.filter(p => assignedIds.includes(p.id));

  const filteredApts = assignedIds === null
    ? appointments
    : appointments.filter(a => assignedIds.includes(a.patientId));

  const filteredRecords = assignedIds === null
    ? dailyCareRecords
    : dailyCareRecords.filter(r => assignedIds.includes(r.patientId));

  const todayApts      = filteredApts.filter(a => a.date === today);
  const todayRecords   = filteredRecords.filter(r => r.date === today);
  // Completed = care records submitted today
  const completedCount = todayRecords.length;
  // Pending = patients who don't yet have a care record today
  const pendingCount   = Math.max(0, filteredPatients.length - completedCount);

  // ─── Trend queries ──────────────────────────────────────────────────────────
  // Runs lightweight COUNT queries — uses current closure values via ref trick
  async function doFetchTrends() {
    // If carer has no assigned patients, nothing to compare
    if (assignedIds !== null && assignedIds.length === 0) {
      setTrends({ totalPatients: null, todayAppointments: null, completedToday: null });
      return;
    }

    const supabase = createClient();
    const now = new Date();

    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    const yesterdayStr   = yest.toISOString().split('T')[0];
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const ids = assignedIds; // stable reference inside async fn

    let qPtThis = supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart);
    let qPtLast = supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd);
    let qApts   = supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('date', yesterdayStr);
    let qDcr    = supabase.from('daily_care_records').select('*', { count: 'exact', head: true }).eq('date', yesterdayStr);

    if (ids !== null && ids.length > 0) {
      qPtThis = qPtThis.in('id', ids);
      qPtLast = qPtLast.in('id', ids);
      qApts   = qApts.in('patient_id', ids);
      qDcr    = qDcr.in('patient_id', ids);
    }

    const [
      { count: ptThisMonth },
      { count: ptLastMonth },
      { count: aptsYest },
      { count: dcrYest },
    ] = await Promise.all([qPtThis, qPtLast, qApts, qDcr]);

    // Total patients at start of month = current total − patients added this month
    const prevTotal = Math.max(0, filteredPatients.length - (ptThisMonth ?? 0));

    setTrends({
      totalPatients:     calcTrend(filteredPatients.length, prevTotal),
      todayAppointments: calcTrend(todayApts.length, aptsYest ?? 0),
      completedToday:    calcTrend(completedCount, dcrYest ?? 0),
    });
  }

  // Keep a ref to the latest version to avoid stale closures in the interval
  const trendFnRef = useRef(doFetchTrends);
  trendFnRef.current = doFetchTrends;

  // Re-fetch trends whenever the store finishes loading (initial load + auto-refresh)
  useEffect(() => {
    if (!isLoading) trendFnRef.current();
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-refresh every 60 s ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      await Promise.all([fetchPatients(), fetchAppointments(), fetchDailyCareRecords()]);
      trendFnRef.current();
    }, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    totalPatients:         filteredPatients.length,
    todayAppointments:     todayApts.length,
    pendingRecords:        pendingCount,
    completedToday:        completedCount,
    trends,
    todayAppointmentsList: todayApts.slice(0, 5),
    recentPatients:        filteredPatients.slice(0, 5),
    isLoading,
  };
}
