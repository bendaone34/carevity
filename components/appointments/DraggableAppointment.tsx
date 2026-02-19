'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Appointment } from '@/lib/types';
import { User, GripVertical } from 'lucide-react';

interface DraggableAppointmentProps {
  appointment: Appointment;
  overlay?: boolean;
}

const typeColors = {
  checkup: 'bg-sky-100 dark:bg-sky-900/50 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200',
  consultation: 'bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200',
  'follow-up': 'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
  emergency: 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
};

const statusDots = {
  scheduled: 'bg-blue-500',
  'in-progress': 'bg-amber-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export default function DraggableAppointment({ appointment, overlay = false }: DraggableAppointmentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const content = (
    <div
      className={`p-2 rounded-lg border-l-4 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        typeColors[appointment.type]
      } ${isDragging ? 'shadow-lg scale-105 ring-2 ring-sky-500' : 'hover:shadow-md'} ${
        overlay ? 'shadow-2xl scale-105' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${statusDots[appointment.status]}`} />
            <p className="font-medium text-sm truncate">{appointment.patientName}</p>
          </div>
          <div className="flex items-center gap-1 text-xs opacity-75">
            <User className="w-3 h-3" />
            <span className="truncate">{appointment.doctorName.replace('Dr. ', '')}</span>
          </div>
          <p className="text-xs mt-1 capitalize opacity-75">{appointment.type}</p>
        </div>
      </div>
    </div>
  );

  if (overlay) {
    return content;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {content}
    </div>
  );
}