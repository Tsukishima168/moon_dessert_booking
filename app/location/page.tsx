import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '門市資訊｜月島甜點',
  description:
    '月島甜點門市資訊：台南市安南區本原街一段 97 巷 168 號，果菜市場周邊。週一公休；週二至五 13:00–18:00；週六日 11:00–18:00。',
  alternates: { canonical: '/location' },
  openGraph: {
    title: '門市資訊｜月島甜點 | MOON MOON 月島甜點',
    description: '台南市安南區本原街一段 97 巷 168 號，果菜市場周邊。週一公休；週二至五 13:00–18:00；週六日 11:00–18:00。',
    url: 'https://shop.kiwimu.com/location',
    type: 'article',
  },
};

const GOOGLE_MAPS_QUERY = encodeURIComponent('台南市安南區本原街一段97巷168號 月島甜點');

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-moon-black">
      {/* Hero */}
      <section className="border-b border-moon-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 brand-section text-center">
          <div className="flex justify-center mb-6">
            <Eyebrow bordered>LOCATION · 門市資訊</Eyebrow>
          </div>
          <h1 className="brand-display text-2xl sm:text-3xl lg:text-4xl mb-6 leading-snug">
            安南區・本原街，
            <br className="hidden sm:block" />
            果菜市場邊上的甜點工作室。
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            這裡不是觀光大街，而是日常會經過的地方——就像甜點本來該有的位置。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 地址與時間 */}
        <section className="brand-section">
          <SectionHeading className="mb-8 sm:mb-12" title="地址與營業時間" />
          <div className="space-y-4 max-w-2xl mx-auto text-center">
            <p className="brand-body text-sm sm:text-base text-moon-text">
              台南市安南區本原街一段 97 巷 168 號（709 台南市，果菜市場周邊）
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              週一公休；週二至五 13:00–18:00；週六日 11:00–18:00
              <br />
              臨時營業異動請看月島公告；已預訂的取貨日期與時段以訂單內容為準
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-gold">
              來店前需要確認位置或取貨安排，請透過 LINE 官方帳號 @931cxefd 聯繫我們。
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${GOOGLE_MAPS_QUERY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs sm:text-sm tracking-[0.2em] text-moon-accent underline underline-offset-4 hover:text-moon-text transition-colors"
            >
              在 Google 地圖開啟 ↗
            </a>
          </div>
        </section>

        {/* 自取時段 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="自取時段" subtitle="與門市營業時間分開安排" />
          <p className="brand-body text-sm sm:text-base text-moon-muted max-w-2xl mx-auto text-center">
            預訂取貨請從結帳頁當時開放的日期與時段選擇，並依訂單內容到店。如需提早、延後或變更取貨安排，請先透過 LINE 確認。
          </p>
        </section>

        {/* CTA */}
        <section className="brand-section border-t border-moon-border/40 text-center">
          <p className="brand-body text-base sm:text-lg text-moon-text mb-6">
            想直接預訂再來取貨？
          </p>
          <Link
            href="/"
            className="inline-block bg-moon-accent text-moon-black px-8 py-4 text-xs sm:text-sm tracking-[0.3em] hover:bg-moon-text transition-colors"
          >
            直接預訂本季甜點
          </Link>
        </section>
      </div>
    </div>
  );
}
