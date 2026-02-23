'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { WellbeingAlert } from '@/lib/types';

export function useWellbeingAlerts() {
  const wellbeingAlerts       = useStore((s) => s.wellbeingAlerts);
  const alertAcknowledgements = useStore((s) => s.alertAcknowledgements);

  const activeAlerts   = useMemo(() => wellbeingAlerts.filter((a) => a.status !== 'resolved'), [wellbeingAlerts]);
  const resolvedAlerts = useMemo(() => wellbeingAlerts.filter((a) => a.status === 'resolved'),  [wellbeingAlerts]);

  const openHighCount   = useMemo(() => wellbeingAlerts.filter((a) => a.status === 'open' && a.severity === 'high').length,   [wellbeingAlerts]);
  const openMedCount    = useMemo(() => wellbeingAlerts.filter((a) => a.status === 'open' && a.severity === 'medium').length, [wellbeingAlerts]);
  const openLowCount    = useMemo(() => wellbeingAlerts.filter((a) => a.status === 'open' && a.severity === 'low').length,    [wellbeingAlerts]);
  const openTotalCount  = openHighCount + openMedCount + openLowCount;

  function alertsForPatient(patientId: string): WellbeingAlert[] {
    return wellbeingAlerts.filter((a) => a.patientId === patientId && a.status !== 'resolved');
  }

  function acksForAlert(alertId: string) {
    return alertAcknowledgements.filter((a) => a.alertId === alertId);
  }

  return {
    activeAlerts,
    resolvedAlerts,
    openHighCount,
    openMedCount,
    openLowCount,
    openTotalCount,
    alertsForPatient,
    acksForAlert,
  };
}
