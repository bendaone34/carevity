import AppLayout from '@/components/layout/AppLayout';

export default function RecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
