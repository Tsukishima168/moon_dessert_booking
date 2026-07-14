import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '門市資訊｜月島甜點',
  description:
    '月島甜點門市資訊：台南市安南區本原街一段 97 巷，果菜市場周邊。週一公休，營業時間 10:00–18:00。',
  alternates: { canonical: '/location' },
  openGraph: {
    title: '門市資訊｜月島甜點 | MOON MOON 月島甜點',
    description: '台南市安南區本原街一段 97 巷，果菜市場周邊。週一公休，營業時間 10:00–18:00。',
    url: 'https://shop.kiwimu.com/location',
    type: 'article',
  },
};

const GOOGLE_MAPS_QUERY = encodeURIComponent('台南市安南區本原街一段97巷 月島甜點');

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
              台南市安南區本原街一段 97 巷（709 台南市，果菜市場周邊）
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              週一公休・營業時間 10:00–18:00
              <br />
              實際可自取日期與時段：以結帳頁當下顯示為準
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-gold">
              【待補：門市聯絡電話。原始碼以 NEXT_PUBLIC_STORE_PHONE 環境變數帶入，目前未查得公開號碼值。】
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
          <SectionHeading className="mb-8 sm:mb-12" title="自取時段" subtitle="結帳時可選擇當日時段" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            {['12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'].map(
              (slot) => (
                <div
                  key={slot}
                  className="border border-moon-border/40 bg-moon-dark/30 py-3 text-center text-xs sm:text-sm text-moon-muted"
                >
                  {slot}
                </div>
              )
            )}
          </div>
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
