import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '運送與取貨資訊｜月島甜點',
  description:
    '月島甜點自取與宅配須知：自取地點與時段、宅配範圍與運費、預訂前置天數、公休日。台南市安南區本原街一段 97 巷自取或宅配到府。',
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
            或讓月島宅配到府。
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
              自取地址：台南市安南區本原街一段 97 巷（月島甜點店，果菜市場周邊）。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              週一公休・營業時間 10:00–18:00。結帳時可從當時開放的日期與時段中選擇取貨時間（例如
              12:00–13:00 至 17:00–18:00 之間，每小時一個時段）。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              系統預設至少需提前 3 個工作天預訂，實際天數依當時後台設定與品項狀況而定，請以結帳頁當下顯示為準。
            </p>
          </div>
        </section>

        {/* 宅配資訊 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="宅配到府" subtitle="配送日與運費" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              宅配週日、週一不配送；其餘天數依訂單日期安排到貨，實際天數依當時後台設定為準。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              宅配運費與免運門檻可由後台調整；請以結帳頁當下顯示的金額為準。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-gold">
              【待補：實際宅配涵蓋縣市／偏遠地區加價規則。目前後台可自由設定配送區域，原始碼中未查得固定清單，需 Penso 提供現行政策。】
            </p>
          </div>
        </section>

        {/* 保存與運送注意事項 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="保存與運送注意事項" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="brand-body text-sm sm:text-base text-moon-gold">
              【待補：各品項冷藏／冷凍配送規則、保存方式與保存期限，需 Penso 依配方與出貨方式提供。】
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
