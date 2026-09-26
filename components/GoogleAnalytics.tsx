'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

// R1（v1.1 修訂）：gtag 允許的主機 = kiwimu.com 本尊/子網域，
// 加上 4 個正式舊別名（map 舊別名流量＝正式站 64%，疑似 LINE LIFF 入口，
// 擋掉會讓 GA4 失去最大宗流量 — 詳見 UPGRADE_SPEC.md v1.1）。
// 只擋 localhost、127.0.0.1，以及其他任何 *.vercel.app 預覽網址。
const LEGACY_PRODUCTION_ALIASES = [
    'moon-map-original.vercel.app',
    'moonmoon-dessert-passport.vercel.app',
    'moon-dessert-booking.vercel.app',
    'moonmoon-gacha.vercel.app',
];

function isProductionHost(hostname: string): boolean {
    if (hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com')) return true;
    return LEGACY_PRODUCTION_ALIASES.includes(hostname);
}

export default function GoogleAnalytics() {
    // Use the new Kiwimu-Core GA4 ID for unified funnel tracking
    const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-DM6F27KL8B';
    // SSR 階段沒有 window，一律先當作「不載入」；client mount 後再依 hostname 判斷一次。
    // 注意：window.dataLayer / window.gtag 的 stub 已經在 app/layout.tsx 的 <head>
    // 裡無條件、同步定義好了，跟這裡的正式網域判斷完全脫鉤 —
    // 這裡只決定要不要載入「真正會送資料出去」的 gtag.js + config。
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setShouldLoad(isProductionHost(window.location.hostname));
    }, []);

    // 只在生產環境 + 正式網域載入；localhost、127.0.0.1、其他 *.vercel.app 預覽網址不送資料
    if (!GA_ID || process.env.NODE_ENV !== 'production' || !shouldLoad) {
        return null;
    }

    return (
        <>
            {/* Google Analytics Script */}
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `,
                }}
            />
        </>
    );
}
