import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pb-safe-nav lg:pb-8 print:ml-0 print:p-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
