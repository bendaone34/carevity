import Sidebar from '@/components/layout/Sidebar';
import LoadingWrapper from '@/components/layout/LoadingWrapper';

export default function IncidentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Sidebar />
      <main className="ml-64 p-8">
        <LoadingWrapper>{children}</LoadingWrapper>
      </main>
    </div>
  );
}
