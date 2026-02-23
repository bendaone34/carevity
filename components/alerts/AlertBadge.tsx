import { AlertSeverity, AlertType } from '@/lib/types';

export const SEVERITY_CLASSES: Record<AlertSeverity, string> = {
  low:    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  high:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export const SEVERITY_DOT: Record<AlertSeverity, string> = {
  low:    'bg-yellow-400',
  medium: 'bg-amber-400',
  high:   'bg-red-500',
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  nutrition_low:       'Low Nutrition',
  nutrition_none:      'No Meals',
  fluids_low:          'Low Fluid Intake',
  mood_low:            'Low Mood',
  mood_drop:           'Mood Drop',
  activity_none:       'No Activity',
  medication_refusals: 'Medication Refusals',
  care_plan_overdue:   'Care Plan Overdue',
};

interface SeverityBadgeProps {
  severity: AlertSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${SEVERITY_CLASSES[severity]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[severity]}`} />
      {severity}
    </span>
  );
}

interface AlertTypeBadgeProps {
  alertType: AlertType;
}

export function AlertTypeBadge({ alertType }: AlertTypeBadgeProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
      {ALERT_TYPE_LABELS[alertType]}
    </span>
  );
}
