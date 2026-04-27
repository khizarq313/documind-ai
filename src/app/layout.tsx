import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import MobileTabBar from '@/components/MobileTabBar';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'DocuMind AI',
  description: 'Upload PDFs, ask questions, get AI-powered insights. DocuMind AI is your intelligent document assistant powered by advanced language models.',
  manifest: '/manifest.json',
  icons: { icon: '/brand-mark.svg', apple: '/brand-mark.svg', shortcut: '/brand-mark.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0f1411',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <div id="root">
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
                <MobileTabBar />
                <ServiceWorkerRegistrar />
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
