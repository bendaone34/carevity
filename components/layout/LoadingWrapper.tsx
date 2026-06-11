'use client';

import { useStore } from '@/lib/store';

export default function LoadingWrapper({ children }: { children: React.ReactNode }) {
  const isLoading = useStore((state) => state.isLoading);

  return (
    <>
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-sky-100 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-sky-500 animate-loadingBar" />
        </div>
      )}
      {children}
    </>
  );
}
