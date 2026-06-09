'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  email: string;
  status: 'pending' | 'active' | 'deactivated';
  created_at: string;
};

const STATUS_ICON: Record<FamilyMember['status'], React.ReactNode> = {
  pending:     <Clock className="w-3.5 h-3.5 text-amber-500" />,
  active:      <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  deactivated: <XCircle className="w-3.5 h-3.5 text-gray-400" />,
};

const STATUS_LABEL: Record<FamilyMember['status'], string> = {
  pending:     'Invite sent',
  active:      'Active',
  deactivated: 'Deactivated',
};

export default function FamilyMembersSection({
  patientId,
  canManage,
}: {
  patientId: string;
  canManage: boolean;
}) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', relationship: '', email: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/family/invite?patientId=${patientId}`);
        const json = await res.json();
        if (res.ok) setMembers(json.members ?? []);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [patientId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, ...formData }),
      });
      const json = await res.json();

      if (!res.ok) { setFormError(json.error ?? 'Failed to send invite'); return; }

      toast.success(`Invite sent to ${formData.email}`);
      setMembers((prev) => [
        { id: json.id ?? Date.now().toString(), ...formData, status: 'pending', created_at: new Date().toISOString() },
        ...prev,
      ]);
      setFormData({ name: '', relationship: '', email: '' });
      setShowForm(false);
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('Deactivate this family member? They will lose access to the portal.')) return;

    try {
      const res = await fetch('/api/family/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) { toast.error('Failed to deactivate'); return; }

      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, status: 'deactivated' } : m)
      );
      toast.success('Family member deactivated');
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-500" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Family Portal Access</h3>
        </div>
        {canManage && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite family
          </button>
        )}
      </div>

      {/* Invite form */}
      {showForm && canManage && (
        <form onSubmit={handleInvite} className="mb-5 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-xl space-y-3">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">Send portal invite</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Name"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Relationship"
              placeholder="Daughter, Son, Spouse..."
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="family@example.com"
              icon={<Mail className="w-4 h-4" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 dark:bg-slate-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : members.filter((m) => m.status !== 'deactivated').length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No family portal access granted yet</p>
          {canManage && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Invite a family member to give them read-only access</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {members
            .filter((m) => m.status !== 'deactivated')
            .map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{m.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">· {m.relationship}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {STATUS_ICON[m.status]}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{STATUS_LABEL[m.status]}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">· {m.email}</span>
                  </div>
                </div>
                {canManage && m.status === 'active' && (
                  <button
                    onClick={() => handleDeactivate(m.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Deactivate access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
