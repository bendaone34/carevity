import AppLayout from '@/components/layout/AppLayout';
import LoadingWrapper from '@/components/layout/LoadingWrapper';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      <LoadingWrapper>{children}</LoadingWrapper>
    </AppLayout>
  );
}
