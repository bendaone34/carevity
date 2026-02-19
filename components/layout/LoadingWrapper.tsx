'use client';

import { useStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

export default function LoadingWrapper({ children }: { children: React.ReactNode }) {
  const isLoading = useStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
