import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider, AuthProvider } from '@/components/providers';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import VisitTracker from '@/components/VisitTracker';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  applicationName: 'Code-Me',
  title: 'Code-Me - Online Books & Programming Resources',
  description:
    'Your online bookstore for programming and tech. Browse, buy and read books on any device.',
  manifest: '/alistore/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/alistore/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/alistore/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/alistore/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: '/alistore/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Code-Me',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#142a56' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1730' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <AuthProvider>
          <CartProvider>
            <VisitTracker />
            <ServiceWorkerRegister />
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}