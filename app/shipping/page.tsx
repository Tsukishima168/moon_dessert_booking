import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '運送與取貨資訊｜月島甜點',
  description:
    '月島甜點自取與宅配須知：自取地點與時段、宅配確認方式與運費、可預訂日期。',
  alternates: { canonical: '/shipping' },
  openGraph: {
    title: '運送與取貨資訊｜月島甜點 | MOON MOON 月島甜點',
    description: '自取與宅配須知：地點、時段、運費、預訂前置天數。',
    url: 'https://shop.kiwimu.com/shipping',
    type: 'article',
  },
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-moon-black">
      {/* Hero */}
      <section className="border-b border-moon-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 brand-section text-center">
          <div className="flex justify-center mb-6">
            <Eyebrow bordered>SHIPPING · 運送與取貨</Eyebrow>
          </div>
          <h1 className="brand-display text-2xl sm:text-3xl lg:text-4xl mb-6 leading-snug">
            本原街自取，
            <br className="hidden sm:block" />
            配送安排先確認。
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            結帳時可依當季開放狀態選擇自取或宅配，實際天數與費率以結帳頁當下顯示為準。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 自取資訊 */}
        <section className="brand-section">
          <SectionHeading className="mb-8 sm:mb-12" title="門市自取" subtitle="本原街一段 97 巷" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              自取地址：台南市安南區本原街一段 97 巷 168 號（月島甜點店，果菜市場周邊）。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              週一公休；週二至五 13:00–18:00；週六日 11:00–18:00。臨時營業異動請看月島公告。預訂取貨時段與營業時間分開安排，請從結帳頁當時開放的日期及時段選擇，並依訂單內容取貨。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              請從結帳頁可選的日期安排預訂。不同品項所需準備時間可能不同，急件請先透過 LINE 確認能否安排。
            </p>
          </div>
        </section>

        {/* 宅配資訊 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="宅配到府" subtitle="配送日與運費" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              宅配是否開放請查看結帳頁；配送地點與到貨安排，請在下單前透過 LINE 確認。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              運費與免運門檻請查看結帳頁當下顯示的金額；若有特殊配送需求，請先聯繫我們確認。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-gold">
              請先提供收件縣市、區域與希望到貨日期，讓我們確認是否可以配送及相關費用。
            </p>
          </div>
        </section>

        {/* 保存與運送注意事項 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="保存與運送注意事項" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="brand-body text-sm sm:text-base text-moon-gold">
              不同甜點的保存與食用方式不同，請查看商品頁及取貨時提供的說明。若未找到您要的品項資訊，請先透過 LINE 詢問保存溫度、期限與運送方式。
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="brand-section border-t border-moon-border/40 text-center">
          <p className="brand-body text-base sm:text-lg text-moon-text mb-6">
            還有其他問題？先看看常見問題整理。
          </p>
          <Link
            href="/faq"
            className="inline-block bg-moon-accent text-moon-black px-8 py-4 text-xs sm:text-sm tracking-[0.3em] hover:bg-moon-text transition-colors"
          >
            查看常見問題
          </Link>
        </section>
      </div>
    </div>
  );
}
