import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import CartSidebar from '@/components/CartSidebar';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import FacebookPixel from '@/components/FacebookPixel';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// 網站基本資訊（計畫1：安南區・果菜市場・本原街在地）
const siteConfig = {
  name: 'MOON MOON | 月島甜點',
  title: '月島甜點 | 安南區果菜市場・本原街療癒系甜點預訂',
  description: '安南區本原街・果菜市場周邊療癒系甜點工作室。從情緒出發的甜點設計，結合 Kiwimu MBTI，為你找到最適合當下的甜點。本原街自取或宅配到府。',
  url: 'https://shop.kiwimu.com',
  locale: 'zh_TW',
  type: 'website' as const, // Fix TypeScript type
  image: 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png', // OG 分享圖
};

const publicMenuHighlights = [
  '北海道經典巴斯克',
  '茶香巴斯克',
  '檸檬柚子千層',
  '經典十勝原味千層',
  '奶酒提拉米蘇',
  '經典提拉米蘇',
  '北海道十勝戚風',
  '經典烤布丁',
];

const publicStorePhone = process.env.NEXT_PUBLIC_STORE_PHONE;

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Bakery',
      '@id': `${siteConfig.url}#business`,
      name: 'MOON MOON 月島甜點',
      image: siteConfig.image,
      url: siteConfig.url,
      ...(publicStorePhone ? { telephone: publicStorePhone } : {}),
      address: {
        '@type': 'PostalAddress',
        streetAddress: '台南市安南區本原街一段97巷',
        addressLocality: '安南區',
        addressRegion: '台南市',
        postalCode: '709',
        addressCountry: 'TW',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 23.0478,
        longitude: 120.1831,
      },
      areaServed: ['台南市安南區', '本原街', '果菜市場周邊', '台灣'],
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '19:00',
      },
      priceRange: '$$',
      servesCuisine: 'Dessert',
      description: siteConfig.description,
      hasMenu: `${siteConfig.url}/#menu-section`,
      acceptsReservations: true,
    },
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      inLanguage: 'zh-TW',
      description: siteConfig.description,
      publisher: {
        '@id': `${siteConfig.url}#business`,
      },
      potentialAction: {
        '@type': 'OrderAction',
        target: siteConfig.url,
        name: '線上預訂本季甜點',
      },
    },
    {
      '@type': 'OfferCatalog',
      '@id': `${siteConfig.url}#menu-highlights`,
      name: '月島甜點公開菜單摘要',
      itemListElement: publicMenuHighlights.map((name) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name,
          category: '甜點',
          brand: {
            '@id': `${siteConfig.url}#business`,
          },
        },
      })),
    },
  ],
};


export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ['本原街甜點', '安南區果菜市場甜點', '果菜市場附近甜點', '安南區甜點', '月島甜點', '安南區美食', 'MBTI甜點', '療癒甜點', '甜點訂購', 'MoonMoon Dessert'],
  authors: [{ name: 'Moon Moon Dessert Studio' }],
  creator: 'Moon Moon Dessert Studio',
  publisher: 'Moon Moon Dessert Studio',
  alternates: {
    canonical: '/',
  },

  // Open Graph (Facebook, LINE 等社群平台)
  openGraph: {
    type: siteConfig.type,
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.image,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.image],
    creator: '@moonmoondessert', // 如果有 Twitter 請替換
  },

  // 其他 meta tags
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification (Google Search Console)
  verification: {
    google: '2RFBMYJ30DsIGKJ9nRS1286s4lbJNFMOsK7s_QDQhSs',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="font-sans" suppressHydrationWarning>
      <head>
        {/* Viewport and theme */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0A0A0A" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('moonmoon-theme');
                  var resolved = theme === 'light' ? 'light' : 'dark';
                  document.documentElement.dataset.theme = resolved;
                  document.documentElement.style.colorScheme = resolved;
                } catch (error) {
                  document.documentElement.dataset.theme = 'dark';
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />

        {/* JSON-LD Structured Data - public SEO/GEO facts only */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className={inter.variable}>
        {/* Google Analytics */}
        <GoogleAnalytics />
        {/* Facebook Pixel */}
        <FacebookPixel />

        <Navbar />
        <Suspense fallback={
          <div className="min-h-screen bg-moon-black flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin text-moon-accent mx-auto mb-4 w-12 h-12 border-2 border-moon-accent border-t-transparent rounded-full"></div>
              <p className="text-sm text-moon-muted tracking-widest">LOADING...</p>
            </div>
          </div>
        }>
          <main>{children}</main>
        </Suspense>
        <CartSidebar />
      </body>
    </html>
  );
}
