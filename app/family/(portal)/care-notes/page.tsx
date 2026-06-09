'use client';

import { useEffect, useState, useMemo } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamilyContext } from '@/hooks/useFamilyContext';

type CareNote = {
  id: string;
  date: string;
  carer_name: string;
  mood_score: number;
  mood_notes: string;
  activity: string;
  notes: string;
  meals: {
    breakfast?: { eaten?: boolean };
    lunch?:     { eaten?: boolean };
    dinner?:    { eaten?: boolean };
    fluids_ml?: number;
  };
};

const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😔', 3: '😐', 4: '🙂', 5: '😊' };
const MOOD_LABEL: Record<number, string> = { 1: 'Distressed', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Great' };
const MOOD_COLOR: Record<number, string> = {
  1: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  2: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  3: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  4: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  5: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

function NoteCard({ note }: { note: CareNote }) {
  const [expanded, setExpanded] = useState(false);
  const meals = note.meals ?? {};
  const mealsEaten = [
    meals.breakfast?.eaten && 'Breakfast',
    meals.lunch?.eaten     && 'Lunch',
    meals.dinner?.eaten    && 'Dinner',
  ].filter(Boolean).join(', ');

  const date = new Date(note.date + 'T00:00:00');
  const formattedDate = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="shrink-0 text-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {date.toLocaleDateString('en-GB', { month: 'short' })}
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white leading-none">
              {date.getDate()}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{formattedDate}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Recorded by {note.carer_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {note.mood_score && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${MOOD_COLOR[note.mood_score]}`}>
              {MOOD_EMOJI[note.mood_score]} {MOOD_LABEL[note.mood_score]}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-slate-700 pt-4">
          {mealsEaten && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Meals Eaten</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{mealsEaten}</p>
              {meals.fluids_ml != null && meals.fluids_ml > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{meals.fluids_ml} ml fluids</p>
              )}
            </div>
          )}

          {note.activity && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Activity</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{note.activity}</p>
            </div>
          )}

          {note.mood_notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Mood Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{note.mood_notes}</p>
            </div>
          )}

          {note.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">General Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{note.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FamilyCareNotesPage() {
  const { context, isLoading: contextLoading } = useFamilyContext();
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => {
    if (!context) return;

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_care_records')
        .select('id, date, carer_name, mood_score, mood_notes, activity, notes, meals')
        .eq('patient_id', context!.patientId)
        .order('date', { ascending: false })
        .limit(90);

      if (!error && data) setNotes(data as CareNote[]);
      setIsLoading(false);
    }

    load();
  }, [context]);

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (filterFrom && n.date < filterFrom) return false;
      if (filterTo   && n.date > filterTo)   return false;
      return true;
    });
  }, [notes, filterFrom, filterTo]);

  const inputCls = 'px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Care Notes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Daily updates for {context?.residentName}</p>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">From</label>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">To</label>
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={inputCls} />
        </div>
        {(filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterFrom(''); setFilterTo(''); }}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-gray-100 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-32 bg-gray-100 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-sky-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">No care notes found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
            {filterFrom || filterTo ? 'No notes in this date range. Try adjusting the filters.' : 'Daily care notes will appear here once recorded by the care team.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
          {notes.length >= 90 && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 pt-2">
              Showing the most recent 90 records. Use the date filter to view older notes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
