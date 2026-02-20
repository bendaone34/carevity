'use client';

import { CarePlan } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { User, Calendar, CheckSquare, Target, Trash2 } from 'lucide-react';

interface CarePlanCardProps {
  plan: CarePlan;
  onClick: () => void;
  onDelete: () => void;
}

const statusConfig: Record<CarePlan['status'], { label: string; variant: 'blue' | 'green' | 'yellow' }> = {
  active:    { label: 'Active',    variant: 'blue' },
  completed: { label: 'Completed', variant: 'green' },
  pending:   { label: 'Pending',   variant: 'yellow' },
};

export default function CarePlanCard({ plan, onClick, onDelete }: CarePlanCardProps) {
  const completedTasks = plan.tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = plan.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const { label, variant } = statusConfig[plan.status];

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{plan.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{plan.patientName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={variant}>{label}</Badge>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{plan.description}</p>
      )}

      {/* Meta */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">Assigned to {plan.carerName}</span>
        </div>
        {(plan.startDate || plan.endDate) && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              {plan.startDate ?? '—'} {plan.endDate ? `→ ${plan.endDate}` : ''}
            </span>
          </div>
        )}
        {plan.goals.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Target className="w-4 h-4 shrink-0" />
            <span>{plan.goals.length} goal{plan.goals.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Task progress */}
      {totalTasks > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <div className="flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{completedTasks}/{totalTasks} tasks</span>
            </div>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
