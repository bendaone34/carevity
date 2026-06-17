'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import StaffCard from '@/components/staff/StaffCard';
import InviteStaffModal from '@/components/staff/InviteStaffModal';
import StaffDetails from '@/components/staff/StaffDetails';
import Modal from '@/components/ui/Modal';
import { useStore } from '@/lib/store';
import { useUser } from '@/hooks/useUser';
import { useRole } from '@/hooks/useRole';
import { StaffMember } from '@/lib/types';
import { UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

function StaffCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

type RoleFilter = 'all' | StaffMember['role'];

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'admin',   label: 'Admins' },
  { value: 'manager', label: 'Managers' },
  { value: 'carer',   label: 'Carers' },
];

const roleVariant: Record<StaffMember['role'], 'purple' | 'blue' | 'green'> = {
  admin: 'purple', manager: 'blue', carer: 'green',
};

export default function StaffPage() {
  const { staffMembers, removeStaff, isLoading } = useStore();
  const user = useUser();
  const { isAdmin, role: currentUserRole } = useRole();

  const [isInviteOpen,    setIsInviteOpen]    = useState(false);
  const [selectedMember,  setSelectedMember]  = useState<StaffMember | null>(null);
  const [roleFilter,      setRoleFilter]      = useState<RoleFilter>('all');

  const filtered = useMemo(() =>
    roleFilter === 'all' ? staffMembers : staffMembers.filter((s) => s.role === roleFilter),
  [staffMembers, roleFilter]);

  const counts = useMemo(() => ({
    all:     staffMembers.length,
    admin:   staffMembers.filter((s) => s.role === 'admin').length,
    manager: staffMembers.filter((s) => s.role === 'manager').length,
    carer:   staffMembers.filter((s) => s.role === 'carer').length,
  }), [staffMembers]);

  const handleRemove = async (member: StaffMember) => {
    if (!confirm(`Remove ${member.fullName || member.email} from the clinic? They will lose access immediately.`)) return;
    try {
      await removeStaff(member.id);
      toast.success('Staff member removed');
      if (selectedMember?.id === member.id) setSelectedMember(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove staff');
    }
  };

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Staff' }]} />
      <Header
        title="Staff"
        subtitle="Manage your team and their permissions"
        showAddButton={isAdmin}
        addButtonText="Invite Staff"
        onAddClick={() => setIsInviteOpen(true)}
      />

      {/* Role breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total staff',  value: counts.all,     color: 'text-gray-700 dark:text-gray-300' },
          { label: 'Admins',       value: counts.admin,   color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Managers',     value: counts.manager, color: 'text-sky-600 dark:text-sky-400' },
          { label: 'Carers',       value: counts.carer,   color: 'text-green-600 dark:text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-1 w-fit">
        {ROLE_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRoleFilter(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              roleFilter === value
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            {label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              roleFilter === value
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
            }`}>
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Permission summary banner */}
      {currentUserRole && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
          currentUserRole === 'admin'
            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
            : currentUserRole === 'manager'
            ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
        }`}>
          <UserCog className="w-4 h-4 shrink-0" />
          <span>
            {currentUserRole === 'admin'
              ? 'You have full admin access — you can manage staff, roles, and all records.'
              : currentUserRole === 'manager'
              ? 'You have manager access — you can view all records but cannot delete or manage staff.'
              : 'You have carer access — you can log care records for your assigned patients.'}
          </span>
        </div>
      )}

      {/* Staff grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <StaffCardSkeleton key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              isCurrentUser={member.id === user?.id}
              canManage={isAdmin}
              onClick={() => setSelectedMember(member)}
              onRemove={() => handleRemove(member)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <UserCog className="w-10 h-10 text-sky-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {roleFilter === 'all' ? 'No staff members yet' : `No ${roleFilter}s found`}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            {isAdmin && roleFilter === 'all'
              ? 'Invite your first team member to get started. They\'ll receive an email invitation.'
              : 'No staff members match the current filter.'}
          </p>
          {isAdmin && roleFilter === 'all' && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors"
            >
              Invite first team member
            </button>
          )}
        </div>
      )}

      {/* Invite modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Staff Member" size="md">
        <InviteStaffModal onClose={() => setIsInviteOpen(false)} />
      </Modal>

      {/* Details modal */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title="Staff Member"
        size="md"
      >
        {selectedMember && (
          <StaffDetails
            member={staffMembers.find((s) => s.id === selectedMember.id) ?? selectedMember}
            isCurrentUser={selectedMember.id === user?.id}
            canManage={isAdmin}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </Modal>
    </div>
  );
}
