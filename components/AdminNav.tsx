'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, BarChart3, Settings, Tag, Users, MessageSquare } from 'lucide-react';

export default function AdminNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/admin', label: '訂單管理', icon: Package },
        { href: '/admin/banners', label: 'Banner 管理', icon: MessageSquare },
        { href: '/admin/settings', label: '營業設定', icon: Settings },
        // 未來功能
        // { href: '/admin/products', label: '產品管理', icon: Tag },
        { href: '/admin/promo-codes', label: '優惠碼', icon: Users },
        // { href: '/admin/analytics', label: '數據分析', icon: BarChart3 },
    ];

    return (
        <nav className="border-b border-moon-border bg-moon-dark/50 mb-8">
            <div className="flex items-center gap-1 overflow-x-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-2 px-6 py-4 text-sm whitespace-nowrap
                transition-colors border-b-2
                ${isActive
                                    ? 'border-moon-accent text-moon-accent bg-moon-accent/5'
                                    : 'border-transparent text-moon-muted hover:text-moon-text hover:bg-moon-border/10'
                                }
              `}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
