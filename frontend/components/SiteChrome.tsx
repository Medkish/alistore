'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import WelcomeNote from '@/components/WelcomeNote';

function useStorefront() {
  return !usePathname()?.startsWith('/admin');
}

/**
 * Storefront chrome, split in two so the root layout can place the header
 * above <main> and the footer below it. Rendering both from one component
 * that sits after <main> would push the header to the bottom of the page.
 */
export function SiteHeader() {
  if (!useStorefront()) return null;
  return (
    <>
      <WelcomeNote />
      <Header />
      <BackButton />
    </>
  );
}

export function SiteFooter() {
  if (!useStorefront()) return null;
  return <Footer />;
}

/**
 * The admin dashboard is a separate surface: it keeps the auth and cart
 * providers from the root layout but drops the storefront header, footer,
 * back button and welcome toast so the admin shell owns the whole screen.
 */
export default function SiteChrome() {
  return (
    <>
      <SiteHeader />
      <SiteFooter />
    </>
  );
}
