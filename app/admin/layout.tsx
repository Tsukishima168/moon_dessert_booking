import type { Metadata } from 'next';
import AdminLoginGate from '@/components/AdminLoginGate';
import AdminSidebar from '@/components/AdminSidebar';
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin';

// 後台 SEO - 完全不被搜尋引擎索引
export const metadata: Metadata = {
  title: '管理後台 | 月島甜點',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

// 伺服器端守門：透過 DB session 驗證 admin_token cookie
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await ensureAdmin();

  if (!isAdmin) {
    return <AdminLoginGate />;
  }

  return (
    <div className="admin-shell flex h-screen bg-moon-dark">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
