'use client';

import { useState } from 'react';
import { StaffMember } from '@/lib/types';
import { useStore } from '@/lib/store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

interface StaffDetailsProps {
  member: StaffMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onClose: () => void;
}

const roleVariant: Record<StaffMember['role'], 'purple' | 'blue' | 'green'> = {
  admin: 'purple', manager: 'blue', carer: 'green',
};

export default function StaffDetails({ member, isCurrentUser, canManage, onClose }: StaffDetailsProps) {
  const { patients, updateStaff, assignPatient, unassignPatient } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName,  setFullName]  = useState(member.fullName);
  const [phone,     setPhone]     = useState(member.phone);
  const [jobTitle,  setJobTitle]  = useState(member.jobTitle);
  const [role,      setRole]      = useState(member.role);
  const [isSaving,  setIsSaving]  = useState(false);
  const [togglingPatient, setTogglingPatient] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateStaff(member.id, { fullName, phone, jobTitle, role });
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePatient = async (patientId: string) => {
    setTogglingPatient(patientId);
    try {
      if (member.assignedPatientIds.includes(patientId)) {
        await unassignPatient(member.id, patientId);
      } else {
        await assignPatient(member.id, patientId);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update assignment');
    } finally {
      setTogglingPatient(null);
    }
  };

  const roleOptions = [
    { value: 'admin',   label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'carer',   label: 'Carer' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">
              {member.fullName
                ? member.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                : member.email.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 dark:text-white">
                {member.fullName || <span className="italic text-gray-400">Pending invite</span>}
              </p>
              {!member.isOnboarded && <Badge variant="yellow">Pending onboarding</Badge>}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
          </div>
        </div>
        <Badge variant={roleVariant[member.role]}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </Badge>
      </div>

      {/* Edit form */}
      {isEditing ? (
        <div className="space-y-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7..." />
          <Input label="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Carer" />
          {canManage && !isCurrentUser && (
            <Select
              label="Role"
              options={roleOptions}
              value={role}
              onChange={(e) => setRole(e.target.value as StaffMember['role'])}
            />
          )}
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>Save</Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Phone',     value: member.phone     || '—' },
            { label: 'Job title', value: member.jobTitle  || '—' },
            { label: 'Joined',    value: member.createdAt || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">{value}</p>
            </div>
          ))}
          {(canManage || isCurrentUser) && member.isOnboarded && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="col-span-2">
              Edit profile
            </Button>
          )}
        </div>
      )}

      {/* Patient assignments — carers only, admin can manage */}
      {member.role === 'carer' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Assigned patients
            <span className="ml-2 text-xs text-gray-400 font-normal">
              ({member.assignedPatientIds.length}/{patients.length})
            </span>
          </h3>
          {patients.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No patients in your clinic yet.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {patients.map((patient) => {
                const assigned  = member.assignedPatientIds.includes(patient.id);
                const toggling  = togglingPatient === patient.id;
                return (
                  <label
                    key={patient.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      assigned
                        ? 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20'
                        : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
                    } ${!canManage ? 'pointer-events-none' : ''}`}
                  >
                    {toggling ? (
                      <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : assigned ? (
                      <CheckSquare className="w-4 h-4 text-sky-500 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" />
                    )}
                    {canManage && (
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={assigned}
                        onChange={() => handleTogglePatient(patient.id)}
                      />
                    )}
                    <span className="text-sm text-gray-800 dark:text-white">
                      {patient.firstName} {patient.lastName}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleTogglePatient(patient.id)}
                        className="ml-auto text-xs text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        {assigned ? 'Remove' : 'Assign'}
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
