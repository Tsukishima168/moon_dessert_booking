'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface Banner {
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    link_url?: string;
    link_text?: string;
    background_color: string;
    text_color: string;
    display_type: 'hero' | 'announcement';
}

export default function Banner() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBanners();

        // 從 localStorage 載入已關閉的 Banner
        const dismissed = localStorage.getItem('dismissedBanners');
        if (dismissed) {
            setDismissedBanners(new Set(JSON.parse(dismissed)));
        }
    }, []);

    const fetchBanners = async () => {
        try {
            const response = await fetch('/api/banners');
            if (!response.ok) throw new Error('Failed to fetch banners');

            const data = await response.json();
            const list = Array.isArray(data) ? data : [];
            setBanners(list);
            list.forEach((b: Banner) => {
                if (b.id && b.id !== 'demo') trackBannerView(b.id);
            });
        } catch (error) {
            console.error('取得 Banner 錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const trackBannerView = async (bannerId: string) => {
        try {
            await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bannerId, action: 'view' }),
            });
        } catch (error) {
            console.error('記錄 Banner 顯示錯誤:', error);
        }
    };

    const trackBannerClick = async (bannerId: string) => {
        try {
            await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bannerId, action: 'click' }),
            });
        } catch (error) {
            console.error('記錄 Banner 點擊錯誤:', error);
        }
    };

    const dismissBanner = (bannerId: string) => {
        const newDismissed = new Set(dismissedBanners);
        newDismissed.add(bannerId);
        setDismissedBanners(newDismissed);
        localStorage.setItem('dismissedBanners', JSON.stringify(Array.from(newDismissed)));
    };

    if (loading) {
        return null;
    }

    // 無 Banner 時顯示預覽用示範（僅供開發/預覽，正式上線前可從後台新增真實 Banner）
    const demoBanner: Banner = {
        id: 'demo',
        title: '🌹 本季精選 · 草莓系列預訂中',
        description: '即日起預訂享早鳥優惠，限量供應',
        image_url: 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png',
        background_color: '#d4a574',
        text_color: '#0a0a0a',
        display_type: 'hero',
    };

    const displayBanners = banners.length > 0 ? banners : [demoBanner];

    // 過濾已關閉的 Banner
    const visibleBanners = displayBanners.filter(banner => !dismissedBanners.has(banner.id));

    if (visibleBanners.length === 0) {
        return null;
    }

    // 只顯示第一個 Banner
    const banner = visibleBanners[0];

    return (
        <>
            {banner.display_type === 'hero' ? (
                <HeroBanner
                    banner={banner}
                    onDismiss={() => dismissBanner(banner.id)}
                    onLinkClick={() => trackBannerClick(banner.id)}
                />
            ) : (
                <AnnouncementBanner
                    banner={banner}
                    onDismiss={() => dismissBanner(banner.id)}
                    onLinkClick={() => trackBannerClick(banner.id)}
                />
            )}
        </>
    );
}

// Hero Banner Component (大型橫幅)
function HeroBanner({
    banner,
    onDismiss,
    onLinkClick
}: {
    banner: Banner;
    onDismiss: () => void;
    onLinkClick: () => void;
}) {
    return (
        <div
            className="relative border border-moon-border p-4 sm:p-6 mb-6 sm:mb-8 group w-full overflow-hidden"
            style={{
                backgroundColor: `${banner.background_color}10`,
                borderColor: banner.background_color
            }}
        >
            {/* 關閉按鈕 */}
            <button
                onClick={onDismiss}
                className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: banner.text_color }}
                aria-label="關閉"
            >
                <X size={18} />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pr-6">
                {/* 圖片 */}
                {banner.image_url && (
                    <div className="flex-shrink-0">
                        <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                        />
                    </div>
                )}

                {/* 內容 */}
                <div className="flex-1 text-center sm:text-left">
                    <h3
                        className="text-base sm:text-lg tracking-wider mb-1 sm:mb-2 font-light"
                        style={{ color: banner.text_color }}
                    >
                        {banner.title}
                    </h3>

                    {banner.description && (
                        <p
                            className="text-xs sm:text-sm mb-3 sm:mb-4 opacity-90"
                            style={{ color: banner.text_color }}
                        >
                            {banner.description}
                        </p>
                    )}

                    {/* 連結按鈕 */}
                    {banner.link_url && (
                        <Link
                            href={banner.link_url}
                            onClick={(e) => {
                                onLinkClick();
                                if (banner.link_url?.startsWith('#')) {
                                    e.preventDefault();
                                    document.getElementById(banner.link_url!.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className="inline-block px-4 sm:px-6 py-2 border transition-colors text-xs sm:text-sm tracking-wider"
                            style={{
                                backgroundColor: banner.background_color,
                                color: '#ffffff',
                                borderColor: banner.background_color
                            }}
                        >
                            {banner.link_text || '立即查看'} →
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

// Announcement Banner Component (頂部公告條)
function AnnouncementBanner({
    banner,
    onDismiss,
    onLinkClick
}: {
    banner: Banner;
    onDismiss: () => void;
    onLinkClick: () => void;
}) {
    return (
        <div
            className="relative px-4 py-3 mb-4 text-center text-sm"
            style={{
                backgroundColor: banner.background_color,
                color: banner.text_color
            }}
        >
            <button
                onClick={onDismiss}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: banner.text_color }}
                aria-label="關閉"
            >
                <X size={16} />
            </button>

            <span className="mr-2">{banner.title}</span>

            {banner.link_url && (
                <Link
                    href={banner.link_url}
                    onClick={onLinkClick}
                    className="underline font-medium"
                    style={{ color: banner.text_color }}
                >
                    {banner.link_text || '了解更多'} →
                </Link>
            )}
        </div>
    );
}
