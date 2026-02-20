'use client';

import { useState } from 'react';
import { CarePlan, CarePlanTask } from '@/lib/types';
import { useStore } from '@/lib/store';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import CarePlanForm from './CarePlanForm';
import { User, Calendar, Target, FileText, CheckSquare, Circle, Clock, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CarePlanDetailsProps {
  plan: CarePlan;
  onClose: () => void;
}

const taskStatusConfig: Record<CarePlanTask['status'], { label: string; next: CarePlanTask['status']; icon: React.ReactNode; color: string }> = {
  pending:     { label: 'Pending',     next: 'in_progress', icon: <Circle className="w-4 h-4" />,      color: 'text-gray-400' },
  in_progress: { label: 'In progress', next: 'completed',   icon: <Clock className="w-4 h-4" />,       color: 'text-amber-500' },
  completed:   { label: 'Completed',   next: 'pending',     icon: <CheckSquare className="w-4 h-4" />, color: 'text-green-500' },
};

const planStatusConfig: Record<CarePlan['status'], { variant: 'blue' | 'green' | 'yellow' }> = {
  active:    { variant: 'blue' },
  completed: { variant: 'green' },
  pending:   { variant: 'yellow' },
};

export default function CarePlanDetails({ plan, onClose }: CarePlanDetailsProps) {
  const { updateCarePlanTask } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  if (isEditing) {
    return <CarePlanForm existing={plan} onClose={() => { setIsEditing(false); onClose(); }} />;
  }

  const handleToggleTask = async (task: CarePlanTask) => {
    setTogglingTaskId(task.id);
    try {
      await updateCarePlanTask(task.id, taskStatusConfig[task.status].next);
    } catch {
      toast.error('Failed to update task');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const completedTasks = plan.tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = plan.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.title}</h2>
            <Badge variant={planStatusConfig[plan.status].variant}>
              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
            </Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{plan.patientName}</p>
        </div>
        <Button variant="secondary" onClick={() => setIsEditing(true)}>
          <Edit2 className="w-4 h-4 mr-2" /> Edit
        </Button>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <User className="w-4 h-4" /> Assigned carer
          </div>
          <p className="font-medium text-gray-900 dark:text-white">{plan.carerName}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <Calendar className="w-4 h-4" /> Timeline
          </div>
          <p className="font-medium text-gray-900 dark:text-white">
            {plan.startDate ?? '—'} {plan.endDate ? `→ ${plan.endDate}` : ''}
          </p>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{plan.description}</p>
        </div>
      )}

      {/* Goals */}
      {plan.goals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Goals</h3>
          </div>
          <ul className="space-y-2">
            {plan.goals.map((goal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="w-5 h-5 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tasks */}
      {plan.tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tasks ({completedTasks}/{totalTasks})
              </h3>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{progress}% complete</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mb-4">
            <div
              className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="space-y-2">
            {plan.tasks.map((task) => {
              const config = taskStatusConfig[task.status];
              const isToggling = togglingTaskId === task.id;
              return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-600 transition-colors"
                >
                  <button
                    onClick={() => handleToggleTask(task)}
                    disabled={isToggling}
                    className={`mt-0.5 shrink-0 ${config.color} hover:opacity-70 transition-opacity disabled:opacity-50`}
                    title={`Click to mark as ${taskStatusConfig[config.next].label}`}
                  >
                    {isToggling ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      config.icon
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.dueDate && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{task.dueDate}</span>
                    )}
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Notes */}
      {plan.notes && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
            {plan.notes}
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
