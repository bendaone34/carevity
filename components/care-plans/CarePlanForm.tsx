'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { CarePlan } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface TaskDraft {
  title: string;
  description: string;
  dueDate: string;
}

interface CarePlanFormProps {
  onClose: () => void;
  existing?: CarePlan;
}

export default function CarePlanForm({ onClose, existing }: CarePlanFormProps) {
  const { patients, addCarePlan, updateCarePlan } = useStore();

  const [formData, setFormData] = useState({
    patientId: existing?.patientId ?? '',
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    carerName: existing?.carerName ?? '',
    status: existing?.status ?? 'pending' as CarePlan['status'],
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
    goals: existing?.goals.join(', ') ?? '',
    notes: existing?.notes ?? '',
  });

  const [tasks, setTasks] = useState<TaskDraft[]>(
    existing?.tasks.map((t) => ({
      title: t.title,
      description: t.description ?? '',
      dueDate: t.dueDate ?? '',
    })) ?? []
  );

  const [isSaving, setIsSaving] = useState(false);

  const set = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const addTask = () => setTasks((prev) => [...prev, { title: '', description: '', dueDate: '' }]);
  const removeTask = (i: number) => setTasks((prev) => prev.filter((_, idx) => idx !== i));
  const updateTask = (i: number, field: keyof TaskDraft, value: string) =>
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.title || !formData.carerName) return;

    setIsSaving(true);
    try {
      const goals = formData.goals
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      if (existing) {
        await updateCarePlan(existing.id, {
          title: formData.title,
          description: formData.description || undefined,
          goals,
          carerName: formData.carerName,
          status: formData.status,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          notes: formData.notes || undefined,
        });
        toast.success('Care plan updated');
      } else {
        const validTasks = tasks.filter((t) => t.title.trim());
        await addCarePlan(
          {
            patientId: formData.patientId,
            title: formData.title,
            description: formData.description || undefined,
            goals,
            carerName: formData.carerName,
            status: formData.status,
            startDate: formData.startDate || undefined,
            endDate: formData.endDate || undefined,
            notes: formData.notes || undefined,
          },
          validTasks.map((t) => ({
            title: t.title.trim(),
            description: t.description || undefined,
            dueDate: t.dueDate || undefined,
          }))
        );
        toast.success('Care plan created');
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const patientOptions = [
    { value: '', label: 'Select a patient' },
    ...patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Patient <span className="text-red-500">*</span>
          </label>
          <Select
            options={patientOptions}
            value={formData.patientId}
            onChange={(e) => set('patientId', e.target.value)}
            disabled={!!existing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
          <Select
            options={statusOptions}
            value={formData.status}
            onChange={(e) => set('status', e.target.value)}
          />
        </div>
      </div>

      {/* Title */}
      <Input
        label="Plan title *"
        placeholder="e.g. Post-surgery recovery plan"
        value={formData.title}
        onChange={(e) => set('title', e.target.value)}
        required
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
        <textarea
          rows={2}
          placeholder="Brief overview of this care plan..."
          value={formData.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition resize-none"
        />
      </div>

      {/* Carer & Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Assigned carer *"
          placeholder="Carer / staff name"
          value={formData.carerName}
          onChange={(e) => set('carerName', e.target.value)}
          required
        />
        <Input
          label="Start date"
          type="date"
          value={formData.startDate}
          onChange={(e) => set('startDate', e.target.value)}
        />
        <Input
          label="End date"
          type="date"
          value={formData.endDate}
          onChange={(e) => set('endDate', e.target.value)}
        />
      </div>

      {/* Goals */}
      <Input
        label="Goals (comma-separated)"
        placeholder="e.g. Improve mobility, Reduce pain, Independent dressing"
        value={formData.goals}
        onChange={(e) => set('goals', e.target.value)}
      />

      {/* Tasks */}
      {!existing && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks</label>
            <button
              type="button"
              onClick={addTask}
              className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline"
            >
              <Plus className="w-4 h-4" /> Add task
            </button>
          </div>
          {tasks.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No tasks yet — click "Add task" to create one.</p>
          )}
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div key={i} className="flex gap-3 items-start bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Task title *"
                    value={task.title}
                    onChange={(e) => updateTask(i, 'title', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={task.description}
                      onChange={(e) => updateTask(i, 'description', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="date"
                      value={task.dueDate}
                      onChange={(e) => updateTask(i, 'dueDate', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
                <button type="button" onClick={() => removeTask(i)} className="p-1.5 hover:text-red-500 transition-colors mt-1">
                  <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
        <textarea
          rows={3}
          placeholder="Any additional notes..."
          value={formData.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSaving}
          disabled={!formData.patientId || !formData.title || !formData.carerName}
        >
          {existing ? 'Save changes' : 'Create care plan'}
        </Button>
      </div>
    </form>
  );
}
