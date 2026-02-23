'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { DailyCareRecord } from '@/lib/types';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { guardOnline } from '@/lib/offline';

interface DailyCareRecordFormProps {
  onClose: () => void;
  prefillPatientId?: string;
}

const MOOD_OPTIONS = [
  { score: 1, emoji: '😢', label: 'Very poor' },
  { score: 2, emoji: '😞', label: 'Poor' },
  { score: 3, emoji: '😐', label: 'OK' },
  { score: 4, emoji: '😊', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
];

const today = new Date().toISOString().split('T')[0];
const nowTime = new Date().toTimeString().slice(0, 5);

function emptyMeal() { return { eaten: false, notes: '' }; }

export default function DailyCareRecordForm({ onClose, prefillPatientId }: DailyCareRecordFormProps) {
  const { patients, addDailyCareRecord } = useStore();

  const [patientId,  setPatientId]  = useState(prefillPatientId ?? '');
  const [date,       setDate]       = useState(today);
  const [carerName,  setCarerName]  = useState('');
  const [recordedAt, setRecordedAt] = useState(nowTime);

  const [meals, setMeals] = useState({
    breakfast: emptyMeal(),
    lunch:     emptyMeal(),
    dinner:    emptyMeal(),
    snacks:    '',
    fluidsMl:  0,
  });

  const [personalCare, setPersonalCare] = useState({
    bathing:  false,
    grooming: false,
    dressing: false,
    oralCare: false,
    notes:    '',
  });

  const [moodScore, setMoodScore] = useState(3);
  const [moodNotes, setMoodNotes] = useState('');
  const [activity,  setActivity]  = useState('');
  const [incidents, setIncidents] = useState('');
  const [notes,     setNotes]     = useState('');
  const [isSaving,  setIsSaving]  = useState(false);

  const toggleMeal = (meal: 'breakfast' | 'lunch' | 'dinner') =>
    setMeals((prev) => ({ ...prev, [meal]: { ...prev[meal], eaten: !prev[meal].eaten } }));

  const setMealNotes = (meal: 'breakfast' | 'lunch' | 'dinner', value: string) =>
    setMeals((prev) => ({ ...prev, [meal]: { ...prev[meal], notes: value } }));

  const toggleCare = (field: 'bathing' | 'grooming' | 'dressing' | 'oralCare') =>
    setPersonalCare((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !carerName) return;
    if (!guardOnline()) return;
    setIsSaving(true);
    try {
      await addDailyCareRecord({
        patientId, date, carerName, recordedAt,
        meals, personalCare, moodScore, moodNotes, activity, incidents, notes,
      });
      toast.success('Daily care record saved');
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

  const sectionTitle = (label: string) => (
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">{label}</h3>
  );

  const checkRow = (checked: boolean, onToggle: () => void, label: string) => (
    <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 cursor-pointer hover:border-sky-200 dark:hover:border-sky-800 transition-colors">
      <input type="checkbox" checked={checked} onChange={onToggle} className="w-4 h-4 rounded accent-sky-500" />
      <span className={`text-sm font-medium ${checked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Basic info ─────────────────────────────────────────────────── */}
      <div>
        {sectionTitle('Basic Information')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Patient <span className="text-red-500">*</span>
            </label>
            <Select
              options={patientOptions}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={!!prefillPatientId}
            />
          </div>
          <Input
            label="Carer name *"
            placeholder="Staff member completing record"
            value={carerName}
            onChange={(e) => setCarerName(e.target.value)}
            required
          />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Time recorded" type="time" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
        </div>
      </div>

      <hr className="border-gray-100 dark:border-slate-700" />

      {/* ── Meals & fluids ─────────────────────────────────────────────── */}
      <div>
        {sectionTitle('Meals & Fluid Intake')}
        <div className="space-y-3">
          {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
            <div key={meal}>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 cursor-pointer hover:border-sky-200 dark:hover:border-sky-800 transition-colors mb-2">
                <input
                  type="checkbox"
                  checked={meals[meal].eaten}
                  onChange={() => toggleMeal(meal)}
                  className="w-4 h-4 rounded accent-sky-500"
                />
                <span className={`text-sm font-medium capitalize ${meals[meal].eaten ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {meal} eaten
                </span>
              </label>
              {meals[meal].eaten && (
                <input
                  type="text"
                  placeholder={`${meal.charAt(0).toUpperCase() + meal.slice(1)} notes (optional)`}
                  value={meals[meal].notes}
                  onChange={(e) => setMealNotes(meal, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Snacks</label>
              <input
                type="text"
                placeholder="e.g. Biscuits, fruit"
                value={meals.snacks}
                onChange={(e) => setMeals((prev) => ({ ...prev, snacks: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fluid intake (ml)</label>
              <input
                type="number"
                min={0}
                step={50}
                placeholder="e.g. 1500"
                value={meals.fluidsMl || ''}
                onChange={(e) => setMeals((prev) => ({ ...prev, fluidsMl: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-slate-700" />

      {/* ── Personal care ──────────────────────────────────────────────── */}
      <div>
        {sectionTitle('Personal Care')}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {checkRow(personalCare.bathing,  () => toggleCare('bathing'),  'Bathing / showering')}
          {checkRow(personalCare.grooming, () => toggleCare('grooming'), 'Hair & grooming')}
          {checkRow(personalCare.dressing, () => toggleCare('dressing'), 'Dressing')}
          {checkRow(personalCare.oralCare, () => toggleCare('oralCare'), 'Oral care')}
        </div>
        <input
          type="text"
          placeholder="Personal care notes (optional)"
          value={personalCare.notes}
          onChange={(e) => setPersonalCare((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
        />
      </div>

      <hr className="border-gray-100 dark:border-slate-700" />

      {/* ── Mood & wellbeing ───────────────────────────────────────────── */}
      <div>
        {sectionTitle('Mood & Wellbeing')}
        <div className="flex gap-2 mb-3">
          {MOOD_OPTIONS.map(({ score, emoji, label }) => (
            <button
              key={score}
              type="button"
              onClick={() => setMoodScore(score)}
              title={label}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all duration-150 ${
                moodScore === score
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                  : 'border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          placeholder="Mood / wellbeing notes..."
          value={moodNotes}
          onChange={(e) => setMoodNotes(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
        />
      </div>

      <hr className="border-gray-100 dark:border-slate-700" />

      {/* ── Activity & incidents ───────────────────────────────────────── */}
      <div>
        {sectionTitle('Activity & Incidents')}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Physical activity</label>
            <input
              type="text"
              placeholder="e.g. 20 min walk, chair exercises"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Incidents / concerns
              <span className="ml-2 text-xs text-red-500 font-normal">(leave blank if none)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Describe any falls, pain, behavioural changes, or other concerns..."
              value={incidents}
              onChange={(e) => setIncidents(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition resize-none ${
                incidents
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 focus:ring-red-400'
                  : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 focus:ring-sky-500'
              }`}
            />
          </div>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-slate-700" />

      {/* ── General notes ─────────────────────────────────────────────── */}
      <div>
        {sectionTitle('General Notes')}
        <textarea
          rows={3}
          placeholder="Any additional observations..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" isLoading={isSaving} disabled={!patientId || !carerName}>
          Save record
        </Button>
      </div>
    </form>
  );
}
