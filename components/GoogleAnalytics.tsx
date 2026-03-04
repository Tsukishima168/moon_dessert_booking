'use client';

import Script from 'next/script';

export default function GoogleAnalytics() {
    // Use the new Kiwimu-Core GA4 ID for unified funnel tracking
    const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-DM6F27KL8B';

    // 只在生產環境載入
    if (!GA_ID || process.env.NODE_ENV !== 'production') {
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
