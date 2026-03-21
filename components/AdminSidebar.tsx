'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  BarChart3,
  Mail,
  Bell,
  Zap,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Package,
  Tag,
  Image as ImageIcon,
  Megaphone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const coreNavItems: NavItem[] = [
  {
    label: '訂單管理',
    href: '/admin',
    icon: <ShoppingCart size={20} />,
  },
  {
    label: '菜單管理',
    href: '/admin/menu',
    icon: <Package size={20} />,
  },
  {
    label: '菜單可用性',
    href: '/admin/menu-availability',
    icon: <CalendarIcon width={20} height={20} />,
  },
  {
    label: '優惠碼',
    href: '/admin/promo-codes',
    icon: <Tag size={20} />,
  },
  {
    label: '橫幅管理',
    href: '/admin/banners',
    icon: <ImageIcon size={20} />,
  },
  {
    label: '設置',
    href: '/admin/settings',
    icon: <Settings size={20} />,
  },
];

const devNavItems: NavItem[] = [
  {
    label: '客戶分析',
    href: '/admin/customer-analytics',
    icon: <Users size={20} />,
  },
  {
    label: 'Email 模板',
    href: '/admin/email-templates',
    icon: <Mail size={20} />,
  },
  {
    label: '推送模板',
    href: '/admin/push-templates',
    icon: <Bell size={20} />,
  },
  {
    label: '行銷活動',
    href: '/admin/campaigns',
    icon: <Megaphone size={20} />,
  },
  {
    label: '自動化行銷',
    href: '/admin/marketing-automation',
    icon: <Zap size={20} />,
  },
  {
    label: 'Discord 設置',
    href: '/admin/discord-settings',
    icon: <BarChart3 size={20} />,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname() || '';
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDevMode = process.env.NODE_ENV !== 'production';
  const navItems = [...coreNavItems, ...(isDevMode ? devNavItems : [])];

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('登出錯誤:', error);
    }
  };

  const NavContent = () => (
    <nav className="flex-1 px-4 py-6 overflow-y-auto">
      <div className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 transition-all ${isActive
                  ? 'bg-moon-accent text-moon-black font-semibold'
                  : 'text-moon-muted hover:text-moon-text hover:bg-moon-black/50'
                }`}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsed ? item.label : ''}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="flex-1">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="px-2 py-1 text-xs bg-red-500 text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* 桌面版側邊欄 */}
      <aside className={`hidden md:flex flex-col bg-moon-black border-r border-moon-border h-screen sticky top-0 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo 區域 */}
        <div className={`px-4 py-6 border-b border-moon-border flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-moon-accent flex items-center justify-center">
                <span className="text-moon-black font-bold">🌙</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-moon-accent text-sm">管理後台</h1>
                <p className="text-xs text-moon-muted truncate">MoonMoon Dessert</p>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="flex items-center justify-center w-10 h-10 bg-moon-accent">
              <span className="text-moon-black font-bold">🌙</span>
            </Link>
          )}
          {/* 收起按鈕 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-moon-muted hover:text-moon-text hover:bg-moon-black/50 transition-all"
            title={isCollapsed ? '展開' : '收起'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* 導航菜單 */}
        <NavContent />

        {/* 登出按鈕 */}
        <div className="px-4 py-4 border-t border-moon-border">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-semibold ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? '登出' : ''}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>登出</span>}
          </button>
        </div>
      </aside>

      {/* 手機版 - 頂部導航按鈕 */}
      <div className="md:hidden sticky top-0 z-40 bg-moon-black border-b border-moon-border px-4 py-4 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <span className="font-bold text-moon-accent">管理後台</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 hover:bg-moon-border transition"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 手機版 - 滑出菜單 */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] z-30 bg-black/50" onClick={() => setIsMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 w-64 bg-moon-black border-r border-moon-border h-full overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
            <div className="px-4 py-4 border-t border-moon-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-semibold"
              >
                <LogOut size={20} />
                <span>登出</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 日期圖標
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// 日期圖標
function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
