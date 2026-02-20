'use client';

import { DailyCareRecord } from '@/lib/types';
import { User, Clock, Utensils, ShowerHead, AlertTriangle, Smile, Trash2 } from 'lucide-react';

interface DailyCareRecordCardProps {
  record: DailyCareRecord;
  onClick: () => void;
  onDelete: () => void;
}

const MOOD_EMOJI: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😢', label: 'Very poor', color: 'text-red-500' },
  2: { emoji: '😞', label: 'Poor',      color: 'text-orange-500' },
  3: { emoji: '😐', label: 'OK',        color: 'text-amber-500' },
  4: { emoji: '😊', label: 'Good',      color: 'text-green-500' },
  5: { emoji: '😄', label: 'Great',     color: 'text-emerald-500' },
};

export default function DailyCareRecordCard({ record, onClick, onDelete }: DailyCareRecordCardProps) {
  const mealsEaten = [record.meals.breakfast.eaten, record.meals.lunch.eaten, record.meals.dinner.eaten].filter(Boolean).length;
  const careCompleted = [record.personalCare.bathing, record.personalCare.grooming, record.personalCare.dressing, record.personalCare.oralCare].filter(Boolean).length;
  const mood = MOOD_EMOJI[record.moodScore] ?? MOOD_EMOJI[3];
  const hasIncident = record.incidents.trim().length > 0;

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{record.patientName}</h3>
            {hasIncident && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                <AlertTriangle className="w-3 h-3" /> Incident
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{record.date}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Carer & time */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <User className="w-4 h-4" />
          <span>{record.carerName}</span>
        </div>
        {record.recordedAt && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{record.recordedAt}</span>
          </div>
        )}
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
          <Utensils className="w-4 h-4 text-sky-500 mb-1" />
          <span className="text-xs font-semibold text-gray-800 dark:text-white">{mealsEaten}/3</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">Meals</span>
        </div>
        <div className="flex flex-col items-center bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
          <ShowerHead className="w-4 h-4 text-purple-500 mb-1" />
          <span className="text-xs font-semibold text-gray-800 dark:text-white">{careCompleted}/4</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">Care</span>
        </div>
        <div className="flex flex-col items-center bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
          <span className="text-lg leading-none mb-0.5">{mood.emoji}</span>
          <span className={`text-xs font-semibold ${mood.color}`}>{record.moodScore}/5</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">Mood</span>
        </div>
      </div>

      {/* Fluid intake */}
      {record.meals.fluidsMl > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          💧 {record.meals.fluidsMl} ml fluids
        </p>
      )}
    </div>
  );
}
