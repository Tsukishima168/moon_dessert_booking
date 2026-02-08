import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import CartSidebar from '@/components/CartSidebar';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import FacebookPixel from '@/components/FacebookPixel';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// 網站基本資訊（計畫1：安南區・果菜市場・本原街在地）
const siteConfig = {
  name: 'MOON MOON | 月島甜點',
  title: '月島甜點 | 安南區果菜市場・本原街療癒系甜點預訂',
  description: '安南區本原街・果菜市場周邊療癒系甜點工作室。從情緒出發的甜點設計，結合 Kiwimu MBTI，為你找到最適合當下的甜點。本原街自取或宅配到府。',
  url: 'https://dessert-booking.vercel.app', // 請替換為您的實際網址
  locale: 'zh_TW',
  type: 'website' as const, // Fix TypeScript type
  image: 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png', // OG 分享圖
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

  // Verification (之後可以加入 Google Search Console 驗證碼)
  // verification: {
  //   google: 'your-google-verification-code',
  // },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        {/* Viewport and theme */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0A0A0A" />

        {/* JSON-LD Structured Data - LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'MOON MOON 月島甜點',
              image: siteConfig.image,
              '@id': siteConfig.url,
              url: siteConfig.url,
              telephone: process.env.STORE_PHONE || '',
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
                latitude: 23.0478, // 請替換為實際座標
                longitude: 120.1831,
              },
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '10:00',
                closes: '19:00',
              },
              sameAs: [
                'https://www.instagram.com/moonmoon_dessert', // 請替換為實際社群連結
                'https://www.facebook.com/moonmoondessert',
              ],
              priceRange: '$$',
              servesCuisine: 'Dessert',
              description: siteConfig.description,
            }),
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
