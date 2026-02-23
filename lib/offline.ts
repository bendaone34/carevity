import toast from 'react-hot-toast';

/**
 * Returns true if the browser is online, false if offline.
 * When offline, shows a toast warning and returns false so callers can
 * guard form submissions:
 *
 *   if (!guardOnline()) return;
 */
export function guardOnline(): boolean {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    toast.error('You are offline — please reconnect before saving.', {
      icon: '📡',
      duration: 4000,
    });
    return false;
  }
  return true;
}
