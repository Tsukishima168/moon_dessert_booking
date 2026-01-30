'use client';

import Script from 'next/script';

export default function GoogleAnalytics() {
    const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;

    // 只在生產環境且有設定 GA4 ID 時載入
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
