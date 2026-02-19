'use client';

import { DragOverlay } from '@dnd-kit/core';
import { Appointment } from '@/lib/types';
import DraggableAppointment from './DraggableAppointment';

interface AppointmentDragOverlayProps {
  activeAppointment: Appointment | null;
}

export default function AppointmentDragOverlay({ activeAppointment }: AppointmentDragOverlayProps) {
  return (
    <DragOverlay>
      {activeAppointment ? (
        <div className="w-[180px]">
          <DraggableAppointment appointment={activeAppointment} overlay />
        </div>
      ) : null}
    </DragOverlay>
  );
}