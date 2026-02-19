'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, BarChart3, Settings, Tag, Users, MessageSquare, Zap, BookOpen, TrendingUp, Mail, Radio } from 'lucide-react';

export default function AdminNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/admin', label: '訂單管理', icon: Package },
        { href: '/admin/menu', label: '菜單管理', icon: BarChart3 },
        
        // 行銷模組
        { href: '/admin/campaigns', label: '行銷活動', icon: Zap },
        { href: '/admin/email-templates', label: 'Email 模板', icon: Mail },
        { href: '/admin/push-templates', label: '推送模板', icon: MessageSquare },
        { href: '/admin/marketing-automation', label: '自動化行銷', icon: TrendingUp },
        { href: '/admin/customer-analytics', label: '客戶分析', icon: Users },
        
        // 其他
        { href: '/admin/discord-settings', label: 'Discord 通知', icon: Radio },
        { href: '/admin/banners', label: 'Banner 管理', icon: BookOpen },
        { href: '/admin/promo-codes', label: '優惠碼', icon: Tag },
        { href: '/admin/settings', label: '業務設定', icon: Settings },
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
