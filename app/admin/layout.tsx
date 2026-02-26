import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase/server-auth';

// 後台 SEO - 完全不被搜尋引擎索引
export const metadata: Metadata = {
  title: '管理後台 | 月島甜點',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

// 伺服器端守門：僅允許 Supabase role=admin 的使用者進入 /admin 區域
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAuthClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/auth/login?redirect=${encodeURIComponent('/admin')}`);
  }

  const role = (session?.user?.app_metadata?.role || session?.user?.user_metadata?.role || '')
    .toString()
    .toLowerCase();

  // 雙重驗證：Supabase role=admin 或 ADMIN_EMAILS 白名單（兩者擇一即可）
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = (session?.user?.email || '').toLowerCase();
  const isAdmin = role === 'admin' || adminEmails.includes(userEmail);

  if (!isAdmin) {
    redirect('/');
  }

  return children;
}
