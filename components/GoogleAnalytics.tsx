'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { GA_ID, isProductionHost } from '@/lib/ga-hosts';

// gtag('js') / gtag('config') are queued synchronously by the <head> bootstrap
// script in app/layout.tsx (see lib/ga-hosts.ts). This component only loads
// gtag.js, which then flushes the queued dataLayer in order: config first,
// then any events tracked before it arrived.
export default function GoogleAnalytics() {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        setShouldLoad(isProductionHost(window.location.hostname));
    }, []);

    if (!GA_ID || process.env.NODE_ENV !== 'production' || !shouldLoad) {
        return null;
    }

    return (
        <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />
    );
}
