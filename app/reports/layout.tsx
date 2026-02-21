import Sidebar from '@/components/layout/Sidebar';
import LoadingWrapper from '@/components/layout/LoadingWrapper';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Sidebar />
      <main className="ml-64 p-8 print:ml-0 print:p-4">
        <LoadingWrapper>{children}</LoadingWrapper>
      </main>
    </div>
  );
}
