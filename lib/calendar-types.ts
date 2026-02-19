export interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

export interface CalendarDay {
  date: Date;
  dateString: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}

export const TIME_SLOTS: TimeSlot[] = [
  { time: '08:00', hour: 8, minute: 0 },
  { time: '08:30', hour: 8, minute: 30 },
  { time: '09:00', hour: 9, minute: 0 },
  { time: '09:30', hour: 9, minute: 30 },
  { time: '10:00', hour: 10, minute: 0 },
  { time: '10:30', hour: 10, minute: 30 },
  { time: '11:00', hour: 11, minute: 0 },
  { time: '11:30', hour: 11, minute: 30 },
  { time: '12:00', hour: 12, minute: 0 },
  { time: '12:30', hour: 12, minute: 30 },
  { time: '13:00', hour: 13, minute: 0 },
  { time: '13:30', hour: 13, minute: 30 },
  { time: '14:00', hour: 14, minute: 0 },
  { time: '14:30', hour: 14, minute: 30 },
  { time: '15:00', hour: 15, minute: 0 },
  { time: '15:30', hour: 15, minute: 30 },
  { time: '16:00', hour: 16, minute: 0 },
  { time: '16:30', hour: 16, minute: 30 },
  { time: '17:00', hour: 17, minute: 0 },
  { time: '17:30', hour: 17, minute: 30 },
  { time: '18:00', hour: 18, minute: 0 },
];

export function getWeekDays(startDate: Date): CalendarDay[] {
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(0, 0, 0, 0);

    days.push({
      date,
      dateString: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime(),
    });
  }

  return days;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}