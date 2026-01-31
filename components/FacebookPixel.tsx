'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function FacebookPixel() {
    const [loaded, setLoaded] = useState(false);
    const pathname = usePathname();
    const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

    useEffect(() => {
        if (!loaded) return;
        // 頁面切換時追蹤 PageView
        import('react-facebook-pixel')
            .then((x) => x.default)
            .then((ReactPixel) => {
                ReactPixel.init(PIXEL_ID!);
                ReactPixel.pageView();
            });
    }, [pathname, loaded, PIXEL_ID]);

    // 如果沒有 ID (開發環境或未設定), 則不渲染
    if (!PIXEL_ID) return null;

    return (
        <>
            <Script
                id="fb-pixel"
                src="https://connect.facebook.net/en_US/fbevents.js"
                onLoad={() => {
                    setLoaded(true);
                }}
            />
            <Script
                id="fb-pixel-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `,
                }}
            />
        </>
    );
}
