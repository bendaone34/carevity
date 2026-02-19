'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import WeekCalendar from '@/components/appointments/WeekCalendar';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import Modal from '@/components/ui/Modal';
import { useStore } from '@/lib/store';
import { Calendar, List, Plus } from 'lucide-react';

export default function AppointmentsPage() {
  const { appointments } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const todayAppointments = appointments.filter(
    (a) => a.date === new Date().toISOString().split('T')[0]
  );

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Appointments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {todayAppointments.length} appointments today • Drag to reschedule
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'calendar'
                  ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && <WeekCalendar />}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">All Appointments</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {appointments.length > 0 ? (
              appointments
                .sort((a, b) => {
                  const dateCompare = a.date.localeCompare(b.date);
                  if (dateCompare !== 0) return dateCompare;
                  return a.time.localeCompare(b.time);
                })
                .map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/50 rounded-xl flex flex-col items-center justify-center">
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                            {new Date(apt.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-sky-700 dark:text-sky-300">
                            {new Date(apt.date).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {apt.patientName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {apt.time} • {apt.doctorName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            apt.type === 'checkup'
                              ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
                              : apt.type === 'consultation'
                              ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                              : apt.type === 'follow-up'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {apt.type}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                              : apt.status === 'cancelled'
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                              : apt.status === 'in-progress'
                              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No appointments found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Appointment"
        size="lg"
      >
        <AppointmentForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}