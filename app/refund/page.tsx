import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '退換貨政策｜月島甜點',
  description: '月島甜點退換貨政策：食品類商品的退換規則、瑕疵處理與申請方式。',
  alternates: { canonical: '/refund' },
  openGraph: {
    title: '退換貨政策｜月島甜點 | MOON MOON 月島甜點',
    description: '食品類商品退換貨規則與申請方式。',
    url: 'https://shop.kiwimu.com/refund',
    type: 'article',
  },
};

type PolicySection = { title: string; body: string };

const SECTIONS: PolicySection[] = [
  {
    title: '退換貨原則',
    body: '【待補：月島甜點屬易腐食品，是否比照食品業慣例「非瑕疵不接受退換」，或提供特定條件下的退換，需 Penso 拍板後填入。】',
  },
  {
    title: '瑕疵商品處理',
    body: '【待補：收到商品有瑕疵（如破損、變質）時的處理流程、需提供的證明（照片/影片）、處理時限，需 Penso 提供。】',
  },
  {
    title: '訂單取消',
    body: '若已完成付款想取消訂單，建議儘快透過頁尾 LINE 官方帳號聯繫我們；實際能否取消依當時備料進度而定。【待補：可取消的時間窗與退款方式（原路退回/其他）。】',
  },
  {
    title: '客製化 / 檔期商品例外',
    body: '【待補：客製化商品（若有）與節慶檔期限定商品是否適用不同的退換規則，需 Penso 確認。】',
  },
];

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-moon-black">
      {/* Hero */}
      <section className="border-b border-moon-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 brand-section text-center">
          <div className="flex justify-center mb-6">
            <Eyebrow bordered>REFUND · 退換貨政策</Eyebrow>
          </div>
          <h1 className="brand-display text-2xl sm:text-3xl lg:text-4xl mb-6 leading-snug">
            甜點是易腐食品，
            <br className="hidden sm:block" />
            我們用這套規則保護雙方。
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            以下條文尚在補齊事實階段，正式生效內容以月島公告版本為準。有疑問請直接透過 LINE 聯繫我們。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {SECTIONS.map((section, index) => (
          <section
            key={section.title}
            className={`brand-section ${index > 0 ? 'border-t border-moon-border/40' : ''}`}
          >
            <SectionHeading className="mb-8 sm:mb-12" title={section.title} />
            <div className="max-w-2xl mx-auto">
              <p className="brand-body text-sm sm:text-base text-moon-gold">{section.body}</p>
            </div>
          </section>
        ))}

        {/* 申請方式 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="申請方式" subtitle="目前唯一管道" />
          <div className="max-w-2xl mx-auto text-center">
            <p className="brand-body text-sm sm:text-base text-moon-muted/90 mb-6">
              如需申請退換貨或有訂單問題，請透過 LINE 官方帳號聯繫月島甜點，我們會盡快協助處理。
            </p>
            <a
              href="https://line.me/R/ti/p/@931cxefd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm border border-[#00B900]/30 text-[#00B900] px-6 py-3 hover:bg-[#00B900]/10 transition-colors"
            >
              聯繫月島甜點（LINE）
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="brand-section border-t border-moon-border/40 text-center">
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
