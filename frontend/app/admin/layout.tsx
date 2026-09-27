import type { Metadata } from 'next';
import AdminLayout from '@/components/admin/AdminLayout';

export const metadata: Metadata = {
  title: 'Admin — Code-Me',
  robots: { index: false, follow: false },
};

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
