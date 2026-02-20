'use client';

import { DailyCareRecord } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { User, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DailyCareRecordDetailsProps {
  record: DailyCareRecord;
  onClose: () => void;
}

const MOOD_INFO: Record<number, { emoji: string; label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
  1: { emoji: '😢', label: 'Very poor', variant: 'red' },
  2: { emoji: '😞', label: 'Poor',      variant: 'red' },
  3: { emoji: '😐', label: 'OK',        variant: 'yellow' },
  4: { emoji: '😊', label: 'Good',      variant: 'green' },
  5: { emoji: '😄', label: 'Great',     variant: 'green' },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{children}</h3>
  );
}

function BoolRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done
        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        : <XCircle    className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" />}
      <span className={done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through'}>
        {label}
      </span>
    </div>
  );
}

function MealRow({ eaten, label, notes }: { eaten: boolean; label: string; notes: string }) {
  return (
    <div>
      <BoolRow done={eaten} label={label} />
      {eaten && notes && (
        <p className="text-xs text-gray-400 dark:text-gray-500 ml-6 mt-0.5">{notes}</p>
      )}
    </div>
  );
}

export default function DailyCareRecordDetails({ record, onClose }: DailyCareRecordDetailsProps) {
  const mood = MOOD_INFO[record.moodScore] ?? MOOD_INFO[3];
  const hasIncident = record.incidents.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{record.patientName}</h2>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <User className="w-4 h-4" />
              <span>{record.carerName}</span>
            </div>
            {record.recordedAt && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{record.recordedAt}</span>
              </div>
            )}
            <Badge variant="gray">{record.date}</Badge>
            {hasIncident && <Badge variant="red"><AlertTriangle className="w-3 h-3 mr-1" />Incident</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meals */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
          <SectionTitle>Meals & Fluids</SectionTitle>
          <div className="space-y-2">
            <MealRow eaten={record.meals.breakfast.eaten} label="Breakfast" notes={record.meals.breakfast.notes} />
            <MealRow eaten={record.meals.lunch.eaten}     label="Lunch"     notes={record.meals.lunch.notes} />
            <MealRow eaten={record.meals.dinner.eaten}    label="Dinner"    notes={record.meals.dinner.notes} />
            {record.meals.snacks && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span className="font-medium">Snacks:</span> {record.meals.snacks}
              </p>
            )}
            {record.meals.fluidsMl > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">💧 Fluids:</span> {record.meals.fluidsMl} ml
              </p>
            )}
          </div>
        </div>

        {/* Personal care */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
          <SectionTitle>Personal Care</SectionTitle>
          <div className="space-y-2">
            <BoolRow done={record.personalCare.bathing}  label="Bathing / showering" />
            <BoolRow done={record.personalCare.grooming} label="Hair & grooming" />
            <BoolRow done={record.personalCare.dressing} label="Dressing" />
            <BoolRow done={record.personalCare.oralCare} label="Oral care" />
            {record.personalCare.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">{record.personalCare.notes}</p>
            )}
          </div>
        </div>

        {/* Mood */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
          <SectionTitle>Mood & Wellbeing</SectionTitle>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{mood.emoji}</span>
            <div>
              <Badge variant={mood.variant}>{mood.label}</Badge>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{record.moodScore}/5</p>
            </div>
          </div>
          {record.moodNotes && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{record.moodNotes}</p>
          )}
        </div>

        {/* Activity */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
          <SectionTitle>Physical Activity</SectionTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {record.activity.trim() || <span className="italic text-gray-400">None recorded</span>}
          </p>
        </div>
      </div>

      {/* Incidents */}
      {hasIncident && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <SectionTitle>Incidents / Concerns</SectionTitle>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">{record.incidents}</p>
        </div>
      )}

      {/* Notes */}
      {record.notes.trim() && (
        <div>
          <SectionTitle>General Notes</SectionTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
            {record.notes}
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
