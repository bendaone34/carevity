'use client';

import { StaffMember } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { Mail, Phone, Briefcase, Users, Trash2 } from 'lucide-react';

interface StaffCardProps {
  member: StaffMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onClick: () => void;
  onRemove: () => void;
}

const roleConfig: Record<StaffMember['role'], { label: string; variant: 'purple' | 'blue' | 'green'; gradient: string }> = {
  admin:   { label: 'Admin',   variant: 'purple', gradient: 'from-purple-400 to-violet-500' },
  manager: { label: 'Manager', variant: 'blue',   gradient: 'from-sky-400 to-blue-500' },
  carer:   { label: 'Carer',   variant: 'green',  gradient: 'from-emerald-400 to-green-500' },
};

export default function StaffCard({ member, isCurrentUser, canManage, onClick, onRemove }: StaffCardProps) {
  const config = roleConfig[member.role];
  const initials = member.fullName
    ? member.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : member.email.slice(0, 2).toUpperCase();

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-12 h-12 bg-gradient-to-br ${config.gradient} rounded-full flex items-center justify-center shrink-0 shadow-sm`}>
          <span className="text-white font-semibold text-sm">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {member.fullName || <span className="text-gray-400 italic">Pending invite</span>}
                </h3>
                {isCurrentUser && (
                  <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">(you)</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={config.variant}>{config.label}</Badge>
                {!member.isOnboarded && <Badge variant="yellow">Pending</Badge>}
                {member.jobTitle && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.jobTitle}</span>
                )}
              </div>
            </div>

            {canManage && !isCurrentUser && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            {member.email && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{member.phone}</span>
              </div>
            )}
            {member.role === 'carer' && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{member.assignedPatientIds.length} patient{member.assignedPatientIds.length !== 1 ? 's' : ''} assigned</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
