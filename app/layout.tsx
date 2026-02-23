import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import ToastProvider from '@/components/ui/Toast';
import StoreInitializer from '@/components/StoreInitializer';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import OfflineBanner from '@/components/layout/OfflineBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Carevity — Healthcare Management',
  description: 'Care management platform for residential and domiciliary care providers',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Carevity',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
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
          <ServiceWorkerRegistration />
          <OfflineBanner />
          <ToastProvider />
          <StoreInitializer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
