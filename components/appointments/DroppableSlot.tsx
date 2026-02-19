'use client';

import { useDroppable } from '@dnd-kit/core';
import { Appointment } from '@/lib/types';
import DraggableAppointment from './DraggableAppointment';

interface DroppableSlotProps {
  id: string;
  date: string;
  time: string;
  appointments: Appointment[];
}

export default function DroppableSlot({ id, date, time, appointments }: DroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { date, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] p-1 border-b border-r border-gray-100 dark:border-slate-700 transition-colors duration-200 ${
        isOver 
          ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-inset ring-sky-500' 
          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="space-y-1">
        {appointments.map((apt) => (
          <DraggableAppointment key={apt.id} appointment={apt} />
        ))}
      </div>
    </div>
  );
}