import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider, AuthProvider, WishlistProvider } from '@/components/providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VisitTracker from '@/components/VisitTracker';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  applicationName: 'AlioStore',
  title: 'AlioStore - Online Books & Programming Resources',
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
    title: 'AlioStore',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#142a56',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <VisitTracker />
              <ServiceWorkerRegister />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}