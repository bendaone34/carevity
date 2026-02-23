'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state from browser
    setIsOnline(navigator.onLine);

    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline — changes won&apos;t be saved until your connection is restored.</span>
    </div>
  );
}
