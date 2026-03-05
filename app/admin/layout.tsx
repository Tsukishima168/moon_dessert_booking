import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import AdminLoginGate from '@/components/AdminLoginGate';

// 後台 SEO - 完全不被搜尋引擎索引
export const metadata: Metadata = {
  title: '管理後台 | 月島甜點',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

// 驗證 admin token（與 /api/admin/auth 的密碼比對）
function isValidAdminToken(token: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedToken = createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedToken;
}

// 伺服器端守門：檢查 cookie 中的 admin_token
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;

  // 無 token 或 token 無效 → 顯示密碼登入頁
  if (!adminToken || !isValidAdminToken(adminToken)) {
    return <AdminLoginGate />;
  }

  return children;
}

