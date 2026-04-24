import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import MobileTabBar from '@/components/MobileTabBar';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'DocuMind AI — Intelligent Document Analysis',
  description: 'Upload PDFs, ask questions, get AI-powered insights. DocuMind AI is your intelligent document assistant powered by advanced language models.',
  manifest: '/manifest.json',
  icons: { icon: '/brand-mark.svg', apple: '/brand-mark.svg', shortcut: '/brand-mark.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0B0F19',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="root">
          <AuthProvider>
            <ToastProvider>
              {children}
              <MobileTabBar />
              <ServiceWorkerRegistrar />
            </ToastProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
