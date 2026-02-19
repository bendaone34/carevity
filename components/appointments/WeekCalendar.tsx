'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { Appointment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { 
  TIME_SLOTS, 
  getWeekDays, 
  getStartOfWeek, 
  formatTime,
  CalendarDay 
} from '@/lib/calendar-types';
import DroppableSlot from './DroppableSlot';
import AppointmentDragOverlay from './AppointmentDragOverlay';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WeekCalendar() {
  const { appointments, updateAppointment } = useStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  const getAppointmentsForSlot = (date: string, time: string): Appointment[] => {
    return appointments.filter((apt) => apt.date === date && apt.time === time);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const appointment = appointments.find((apt) => apt.id === active.id);
    if (appointment) {
      setActiveAppointment(appointment);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAppointment(null);

    if (!over) return;

    const appointmentId = active.id as string;
    const { date, time } = over.data.current as { date: string; time: string };

    const appointment = appointments.find((apt) => apt.id === appointmentId);
    if (!appointment) return;

    // Check if actually moved
    if (appointment.date === date && appointment.time === time) return;

    // Check if slot already has appointment
    const existingAppointment = appointments.find(
      (apt) => apt.date === date && apt.time === time && apt.id !== appointmentId
    );

    if (existingAppointment) {
      toast.error('This time slot is already booked!');
      return;
    }

    // Update appointment
    updateAppointment(appointmentId, { date, time });
    
    toast.success(
      `Appointment moved to ${formatTime(time)} on ${new Date(date).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })}`,
      {
        icon: '📅',
        duration: 3000,
      }
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const formatWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    
    const startMonth = currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const year = currentWeekStart.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${currentWeekStart.getDate()} - ${endDate.getDate()}, ${year}`;
    }
    return `${startMonth} ${currentWeekStart.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {formatWeekRange()}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Today
            </button>
            <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-l-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-r-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Drag appointments to reschedule:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-sky-200 dark:bg-sky-800 border border-sky-300 dark:border-sky-700"></div>
              <span className="text-gray-600 dark:text-gray-400">Checkup</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-800 border border-purple-300 dark:border-purple-700"></div>
              <span className="text-gray-600 dark:text-gray-400">Consultation</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800 border border-green-300 dark:border-green-700"></div>
              <span className="text-gray-600 dark:text-gray-400">Follow-up</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-800 border border-red-300 dark:border-red-700"></div>
              <span className="text-gray-600 dark:text-gray-400">Emergency</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 border-b border-gray-100 dark:border-slate-700">
              <div className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-slate-700">
                Time
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.dateString}
                  className={`p-3 text-center border-r border-gray-100 dark:border-slate-700 last:border-r-0 ${
                    day.isToday ? 'bg-sky-50 dark:bg-sky-900/20' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {day.dayName}
                  </p>
                  <p
                    className={`text-lg font-bold mt-1 ${
                      day.isToday
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-gray-800 dark:text-white'
                    }`}
                  >
                    {day.dayNumber}
                  </p>
                  {day.isToday && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-sky-500 text-white rounded-full mt-1">
                      Today
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="max-h-[600px] overflow-y-auto">
              {TIME_SLOTS.map((slot) => (
                <div key={slot.time} className="grid grid-cols-8">
                  {/* Time Label */}
                  <div className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-b border-gray-100 dark:border-slate-700 text-center bg-gray-50 dark:bg-slate-800/50 sticky left-0">
                    {formatTime(slot.time)}
                  </div>
                  {/* Day Slots */}
                  {weekDays.map((day) => {
                    const slotId = `${day.dateString}-${slot.time}`;
                    const slotAppointments = getAppointmentsForSlot(day.dateString, slot.time);
                    return (
                      <DroppableSlot
                        key={slotId}
                        id={slotId}
                        date={day.dateString}
                        time={slot.time}
                        appointments={slotAppointments}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <AppointmentDragOverlay activeAppointment={activeAppointment} />
      </DndContext>
    </div>
  );
}