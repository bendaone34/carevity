'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/lib/store';
import { Shift } from '@/lib/types';
import ShiftCard from './ShiftCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Week helpers ─────────────────────────────────────────────────────────────

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(start: Date): { date: Date; dateString: string; isToday: boolean }[] {
  const todayStr = new Date().toISOString().split('T')[0];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateString = d.toISOString().split('T')[0];
    return { date: d, dateString, isToday: dateString === todayStr };
  });
}

function formatWeekRange(days: { date: Date }[]): string {
  const start = days[0].date;
  const end   = days[6].date;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`;
}

// ─── Draggable shift card ─────────────────────────────────────────────────────

function DraggableShiftCard({
  shift, canManage, onClick,
}: { shift: Shift; canManage: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    disabled: !canManage,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: canManage ? 'grab' : 'pointer',
  };

  return (
    <div ref={setNodeRef} style={style} {...(canManage ? { ...listeners, ...attributes } : {})}>
      <ShiftCard shift={shift} compact onClick={onClick} />
    </div>
  );
}

// ─── Droppable day column ─────────────────────────────────────────────────────

function DroppableDay({
  dateString, isToday, label, shifts, canManage, onSelectShift, onAddShift,
}: {
  dateString: string;
  isToday: boolean;
  label: string;
  shifts: Shift[];
  canManage: boolean;
  onSelectShift: (s: Shift) => void;
  onAddShift: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateString });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[120px] flex flex-col border-r last:border-r-0 border-gray-100 dark:border-slate-700 transition-colors ${isOver ? 'bg-sky-50 dark:bg-sky-900/10' : ''}`}
    >
      {/* Day heading */}
      <div className={`px-2 py-2 text-center border-b border-gray-100 dark:border-slate-700 ${isToday ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label.split(' ')[0]}</p>
        <p className={`text-lg font-bold leading-tight ${isToday ? 'text-sky-600 dark:text-sky-400' : 'text-gray-800 dark:text-white'}`}>
          {label.split(' ')[1]}
        </p>
      </div>

      {/* Shift cards */}
      <div className="flex-1 p-1.5 space-y-1 min-h-[80px]">
        {shifts.map((s) => (
          <DraggableShiftCard
            key={s.id}
            shift={s}
            canManage={canManage}
            onClick={() => onSelectShift(s)}
          />
        ))}
      </div>

      {/* Add button */}
      {canManage && (
        <div className="p-1.5 pt-0">
          <button
            onClick={onAddShift}
            className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded py-1 transition-colors"
          >
            + Add
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RotaCalendarProps {
  onSelectShift: (shift: Shift) => void;
  onAddShift: (date: string) => void;
  canManage: boolean;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RotaCalendar({ onSelectShift, onAddShift, canManage }: RotaCalendarProps) {
  const shifts = useStore((s) => s.shifts);
  const updateShift = useStore((s) => s.updateShift);

  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const weekDays = getWeekDays(weekStart);

  function prevWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }
  function goToday() {
    setWeekStart(getStartOfWeek(new Date()));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const shiftId = active.id as string;
    const newDate = over.id as string;
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift || shift.date === newDate) return;
    try {
      await updateShift(shiftId, { date: newDate });
      toast.success('Shift moved');
    } catch {
      toast.error('Failed to move shift');
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <button
          onClick={prevWeek}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-800 dark:text-white">
            {formatWeekRange(weekDays)}
          </span>
          <button
            onClick={goToday}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={nextWeek}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Colour legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-400 inline-block" />Morning</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Afternoon</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" />Night</span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="flex min-w-[700px]">
          <DndContext onDragEnd={handleDragEnd}>
            {weekDays.map(({ date, dateString, isToday }, idx) => {
              const dayShifts = shifts.filter((s) => s.date === dateString);
              const label = `${DAY_LABELS[idx]} ${date.getDate()}`;
              return (
                <DroppableDay
                  key={dateString}
                  dateString={dateString}
                  isToday={isToday}
                  label={label}
                  shifts={dayShifts}
                  canManage={canManage}
                  onSelectShift={onSelectShift}
                  onAddShift={() => onAddShift(dateString)}
                />
              );
            })}
          </DndContext>
        </div>
      </div>
    </div>
  );
}
