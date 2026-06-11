import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns a human-readable relative timestamp.
 * Examples: "Today at 2:30pm", "Yesterday at 9:15am", "3 days ago", "12 Jan 2025"
 */
export function formatRelativeTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays   = Math.round((todayStart.getTime() - dateStart.getTime()) / 86_400_000);

  const timeStr = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Yesterday at ${timeStr}`;
  if (diffDays > 1 && diffDays <= 6) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

/**
 * Returns a short human-readable date.
 * Examples: "Today", "Yesterday", "3 days ago", "12 Jan"
 */
export function formatShortDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput + (dateInput.length === 10 ? 'T00:00:00' : '')) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays   = Math.round((todayStart.getTime() - dateStart.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 6) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}