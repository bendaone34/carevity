import FamilyNav from '@/components/family/FamilyNav';

export default function FamilyPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <FamilyNav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
