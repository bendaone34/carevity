'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useSidebar } from '@/context/SidebarContext';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main
        className={`transition-all duration-200 p-4 lg:p-8 pb-safe-nav lg:pb-8 print:ml-0 print:p-4
          ${collapsed ? 'lg:ml-[60px]' : 'lg:ml-[220px]'}`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
