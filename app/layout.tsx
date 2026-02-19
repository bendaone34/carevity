import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import ToastProvider from '@/components/ui/Toast';
import StoreInitializer from '@/components/StoreInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Carevity - Healthcare Management System',
  description: 'A comprehensive healthcare and patient management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider />
          <StoreInitializer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}