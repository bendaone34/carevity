'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '@/lib/store';
import { Shift } from '@/lib/types';
import { useUser } from '@/hooks/useUser';
import { useRole } from '@/hooks/useRole';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import RotaCalendar from '@/components/shifts/RotaCalendar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ShiftCard from '@/components/shifts/ShiftCard';
import ShiftDetails from '@/components/shifts/ShiftDetails';
import ShiftForm from '@/components/shifts/ShiftForm';

export default function ShiftsPage() {
  const user = useUser();
  const { shifts, deleteShift } = useStore();
  const { isAdminOrManager } = useRole();
  const todayISO = new Date().toISOString().split('T')[0];

  const myShifts = shifts
    .filter((s) => s.staffId === user?.id && s.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const defaultTab = isAdminOrManager ? 'rota' : 'my-shifts';
  const [tab, setTab] = useState<'rota' | 'my-shifts'>(defaultTab);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [defaultDate, setDefaultDate]   = useState('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift]   = useState<Shift | null>(null);

  async function handleDelete(shiftId: string) {
    if (!confirm('Delete this shift?')) return;
    try {
      await deleteShift(shiftId);
      toast.success('Shift deleted');
      setSelectedShift(null);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete');
    }
  }

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Shifts & Rota' }]} />
      <Header
        title="Shifts"
        subtitle={isAdminOrManager ? 'Manage rota and staff schedules' : 'Your upcoming shift schedule'}
        showAddButton={isAdminOrManager}
        addButtonText="Create Shift"
        onAddClick={() => { setDefaultDate(''); setAddModalOpen(true); }}
      />

      {/* Tabs — only shown for admin/manager */}
      {isAdminOrManager && (
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700/50 rounded-xl w-fit mb-6">
          {(['rota', 'my-shifts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t === 'rota' ? 'Rota' : 'My Shifts'}
            </button>
          ))}
        </div>
      )}

      {/* Rota tab */}
      {(tab === 'rota' || !isAdminOrManager) && isAdminOrManager && (
        <RotaCalendar
          onSelectShift={setSelectedShift}
          onAddShift={(date) => { setDefaultDate(date); setAddModalOpen(true); }}
          canManage={isAdminOrManager}
        />
      )}

      {/* My Shifts tab */}
      {(tab === 'my-shifts' || !isAdminOrManager) && (
        <div className="space-y-3 max-w-2xl">
          {myShifts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming shifts scheduled.</p>
            </div>
          ) : (
            myShifts.map((s) => {
              const dateDisplay = new Date(s.date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              });
              return (
                <div key={s.id}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-1">
                    {dateDisplay}
                  </p>
                  <ShiftCard shift={s} onClick={() => setSelectedShift(s)} />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Shift modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Create Shift"
        size="lg"
      >
        <ShiftForm defaultDate={defaultDate} onClose={() => setAddModalOpen(false)} />
      </Modal>

      {/* Edit Shift modal */}
      <Modal
        isOpen={!!editingShift}
        onClose={() => setEditingShift(null)}
        title="Edit Shift"
        size="lg"
      >
        {editingShift && (
          <ShiftForm shift={editingShift} onClose={() => setEditingShift(null)} />
        )}
      </Modal>

      {/* Shift Details modal */}
      <Modal
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title="Shift Details"
        size="lg"
      >
        {selectedShift && (
          <ShiftDetails
            shift={selectedShift}
            canManage={isAdminOrManager}
            onEdit={() => { setEditingShift(selectedShift); setSelectedShift(null); }}
            onDelete={() => handleDelete(selectedShift.id)}
            onClose={() => setSelectedShift(null)}
          />
        )}
      </Modal>
    </div>
  );
}
