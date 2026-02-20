'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface InviteStaffModalProps {
  onClose: () => void;
}

export default function InviteStaffModal({ onClose }: InviteStaffModalProps) {
  const { inviteStaff } = useStore();
  const [email,    setEmail]    = useState('');
  const [fullName, setFullName] = useState('');
  const [role,     setRole]     = useState<'manager' | 'carer'>('carer');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;
    setIsSaving(true);
    try {
      await inviteStaff(email, fullName, role);
      toast.success(`Invite sent to ${email}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send invite');
    } finally {
      setIsSaving(false);
    }
  };

  const roleOptions = [
    { value: 'carer',   label: 'Carer — logs daily care records for assigned patients' },
    { value: 'manager', label: 'Manager — views all records, cannot delete' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        An invitation email will be sent. Once accepted, the staff member can log in and access Carevity with the permissions of their assigned role.
      </p>

      <Input
        label="Full name *"
        placeholder="e.g. Sarah Johnson"
        icon={<User className="w-4 h-4" />}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <Input
        label="Email address *"
        type="email"
        placeholder="e.g. sarah@example.com"
        icon={<Mail className="w-4 h-4" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
        <Select
          options={roleOptions}
          value={role}
          onChange={(e) => setRole(e.target.value as 'manager' | 'carer')}
        />
      </div>

      {/* Role description */}
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
        {role === 'carer' ? (
          <>
            <p className="font-medium text-gray-700 dark:text-gray-300">Carer permissions</p>
            <p>• Can log daily care records</p>
            <p>• Can view and update care plans for assigned patients</p>
            <p>• Only sees patients they are assigned to</p>
            <p>• Cannot delete records or patients</p>
          </>
        ) : (
          <>
            <p className="font-medium text-gray-700 dark:text-gray-300">Manager permissions</p>
            <p>• Can view all patients, records, and care plans</p>
            <p>• Can create and update records</p>
            <p>• Cannot delete patients or records</p>
            <p>• Cannot manage staff or roles</p>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" isLoading={isSaving} disabled={!email || !fullName}>
          Send invite
        </Button>
      </div>
    </form>
  );
}
