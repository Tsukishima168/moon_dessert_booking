'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

// R1：GA 只在正式網域送資料。Vercel 的 preview build 也會是 NODE_ENV=production，
// 所以正式網域判斷不能只靠 NODE_ENV，還要檢查 hostname 是不是 kiwimu.com 本尊或其子網域。
function isProductionHost(hostname: string): boolean {
    return hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');
}

export default function GoogleAnalytics() {
    // Use the new Kiwimu-Core GA4 ID for unified funnel tracking
    const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-DM6F27KL8B';
    // SSR 階段沒有 window，一律先當作「不載入」；client mount 後再依 hostname 判斷一次。
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setShouldLoad(isProductionHost(window.location.hostname));
    }, []);

    // 只在生產環境 + 正式網域載入；localhost、127.0.0.1、*.vercel.app 預覽網址不送資料
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
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
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
