import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider, AuthProvider, WishlistProvider } from '@/components/providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'AlioStore - Online Books & Programming Resources',
  description:
    'Your online bookstore for programming and tech. Browse, buy and read books on any device.',
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