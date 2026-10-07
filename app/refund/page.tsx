import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '退換貨政策｜月島甜點',
  description: '月島甜點取消、更改訂單、商品問題與退款進度的聯絡及申請方式。',
  alternates: { canonical: '/refund' },
  openGraph: {
    title: '退換貨政策｜月島甜點 | MOON MOON 月島甜點',
    description: '取消、更改訂單與商品問題的聯絡方式。',
    url: 'https://shop.kiwimu.com/refund',
    type: 'article',
  },
};

type PolicySection = { title: string; body: string };

const SECTIONS: PolicySection[] = [
  {
    title: '退換貨與訂單問題',
    body: '如需退換貨，請透過 LINE 官方帳號提供訂單編號、商品名稱與遇到的問題，讓我們確認訂單並與您討論處理方式。',
  },
  {
    title: '商品有問題時',
    body: '收到商品後若發現破損、品質異常或品項、數量與訂單不符，請儘快聯繫我們。附上商品與包裝照片，有助於確認狀況；請先保留商品與包裝。',
  },
  {
    title: '取消或更改訂單',
    body: '若想取消訂單、更改品項或取貨日期，請儘快透過 LINE 提供訂單編號與需求。我們會確認備料及製作進度，再與您確認能否調整及後續處理方式。',
  },
  {
    title: '退款進度',
    body: '如訂單需要退款，請透過 LINE 與我們確認退款金額、方式及進度。尚未確認原訂單狀態前，請先不要重複下單或付款。',
  },
  {
    title: '客製與檔期商品',
    body: '有插卡、蠟燭、寫字或節慶訂購需求，請先透過 LINE 確認是否可以安排、商品內容與金額，再決定是否訂購。',
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
            訂單有需要調整的地方，
            <br className="hidden sm:block" />
            讓我們一起確認。
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            有商品或訂單問題，請帶著訂單編號與我們聯繫。以下說明如何提出取消、更改與退換貨需求。
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
              <p className="brand-body text-sm sm:text-base text-moon-muted">{section.body}</p>
            </div>
          </section>
        ))}

        {/* 申請方式 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="申請方式" subtitle="請提供訂單編號與問題" />
          <div className="max-w-2xl mx-auto text-center">
            <p className="brand-body text-sm sm:text-base text-moon-muted/90 mb-6">
              如需申請退換貨或有訂單問題，請透過 LINE 官方帳號聯繫月島甜點，我們會盡快協助處理。
            </p>
            <a
              href="https://line.me/R/ti/p/@931cxefd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm border border-moon-accent/30 text-moon-accent px-6 py-3 hover:bg-moon-accent/10 transition-colors"
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
