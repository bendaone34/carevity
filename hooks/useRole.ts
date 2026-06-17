'use client';

import { useStore } from '@/lib/store';

export interface RoleContext {
  role: 'admin' | 'manager' | 'carer' | null;
  isAdmin: boolean;
  isManager: boolean;
  isCarer: boolean;
  isAdminOrManager: boolean;
  canManageStaff: boolean;
  canManageAssignments: boolean;
  canViewReports: boolean;
  canViewAlerts: boolean;
  canDeleteRecords: boolean;
  canInviteFamily: boolean;
  canEditPatients: boolean;
  canManageShifts: boolean;
}

export function useRole(): RoleContext {
  const role = useStore((s) => s.currentUserRole);

  const isAdmin         = role === 'admin';
  const isManager       = role === 'manager';
  const isCarer         = role === 'carer';
  const isAdminOrManager = isAdmin || isManager;

  return {
    role,
    isAdmin,
    isManager,
    isCarer,
    isAdminOrManager,
    canManageStaff:       isAdmin,
    canManageAssignments: isAdminOrManager,
    canViewReports:       isAdminOrManager,
    canViewAlerts:        isAdminOrManager,
    canDeleteRecords:     isAdmin,
    canInviteFamily:      isAdminOrManager,
    canEditPatients:      isAdminOrManager,
    canManageShifts:      isAdminOrManager,
  };
}
