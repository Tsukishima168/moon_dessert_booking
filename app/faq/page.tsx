import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';
import { serializeJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = {
  title: '常見問題｜月島甜點',
  description:
    '月島甜點常見問題整理：Kiwimu MBTI 甜點是什麼、怎麼訂購、自取與宅配時段、運費與預訂天數、付款方式、保存與退換貨。',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: '常見問題｜月島甜點 | MOON MOON 月島甜點',
    description: '訂購、自取、宅配、付款、保存與退換貨的常見問題一次看。',
    url: 'https://shop.kiwimu.com/faq',
    type: 'article',
  },
};

// FAQPage 結構化資料 — 從 app/about/page.tsx 移至此頁（避免重複），供 AI 搜尋引擎與 Google rich result 引用。
// 只收錄可從 repo 現有事實確認的問答；仍待 Penso 補充事實的題目不進 JSON-LD，避免對外公開不確定資訊。
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '月島甜點在哪裡？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '月島甜點位於台南市安南區本原街一段 97 巷，果菜市場周邊，提供本原街自取或宅配到府。',
      },
    },
    {
      '@type': 'Question',
      name: '什麼是 Kiwimu MBTI 甜點？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '月島結合 Kiwimu MBTI，從你當下的情緒與人格狀態推薦適合的甜點；也可以直接瀏覽本季品項預訂。',
      },
    },
    {
      '@type': 'Question',
      name: 'Kiwimu 是什麼？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kiwimu 是月島甜點的品牌核心，一團從鮮奶油誕生、會融化又重組的奶霜生物，代表「被看見」的情緒入口。',
      },
    },
    {
      '@type': 'Question',
      name: '怎麼訂購月島甜點？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '在 shop.kiwimu.com 選擇甜點與規格、加入購物車、前往結帳，依當季可預訂日期選擇本原街自取或宅配到府。',
      },
    },
    {
      '@type': 'Question',
      name: '自取地點與時間是？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '自取地點為台南市安南區本原街一段 97 巷（月島甜點店）。週一公休・營業時間 10:00–18:00；實際可選日期與時段以結帳頁當下顯示為準。',
      },
    },
    {
      '@type': 'Question',
      name: '有哪些付款方式？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '目前支援 LINE Bank 銀行轉帳，部分時期視後台開放狀態也提供 LINE Pay；實際可用方式以結帳頁當下顯示為準。',
      },
    },
  ],
};

type FaqItem = { q: string; a: string };

const FAQ_GROUPS: { title: string; items: FaqItem[] }[] = [
  {
    title: '品牌與購買',
    items: [
      {
        q: '月島甜點在哪裡？',
        a: '月島甜點位於台南市安南區本原街一段 97 巷，果菜市場周邊，提供本原街自取或宅配到府。',
      },
      {
        q: '什麼是 Kiwimu MBTI 甜點？',
        a: '月島結合 Kiwimu MBTI，從你當下的情緒與人格狀態推薦適合的甜點；也可以不做測驗，直接瀏覽本季品項預訂。',
      },
      {
        q: 'Kiwimu 是什麼？',
        a: 'Kiwimu 是月島甜點的品牌核心，一團從鮮奶油誕生、會融化又重組的奶霜生物，代表「被看見」的情緒入口。詳見品牌故事頁。',
      },
      {
        q: '怎麼訂購月島甜點？',
        a: '在 shop.kiwimu.com 選擇甜點與規格、加入購物車、前往結帳，依當季可預訂日期選擇本原街自取或宅配到府。',
      },
    ],
  },
  {
    title: '自取與宅配',
    items: [
      {
        q: '自取地點與時間是？',
        a: '自取地點為台南市安南區本原街一段 97 巷（月島甜點店）。週一公休・營業時間 10:00–18:00；實際可選日期與時段以結帳頁當下顯示為準。',
      },
      {
        q: '宅配範圍與運費怎麼算？',
        a: '宅配週日、週一不配送。運費與免運門檻可由後台調整，請以結帳頁當下顯示為準。【待補：實際宅配涵蓋縣市/地區清單，目前後台可自由設定，未查得固定範圍】',
      },
      {
        q: '需要提前多久預訂？',
        a: '系統預設至少需提前 3 個工作天預訂，實際天數依當時後台設定與品項狀況而定，請以結帳頁當下顯示為準。',
      },
    ],
  },
  {
    title: '保存與售後',
    items: [
      {
        q: '甜點怎麼保存？可以放多久？',
        a: '【待補：各品項實際冷藏／冷凍保存方式與期限，需 Penso 依配方提供】',
      },
      {
        q: '可以客製化甜點嗎（插卡、蠟燭、寫字等）？',
        a: '【待補：是否提供客製化服務與細項規則，需 Penso 確認】',
      },
      {
        q: '訂購後可以取消或退換嗎？',
        a: '食品類訂單的取消與退換規則請見退換貨政策頁，若已完成付款想取消或有其他狀況，建議儘快透過 LINE 官方帳號聯繫我們。',
      },
    ],
  },
  {
    title: '付款',
    items: [
      {
        q: '有哪些付款方式？',
        a: '目前支援 LINE Bank 銀行轉帳，部分時期視後台開放狀態也提供 LINE Pay；實際可用方式與轉帳資訊以結帳頁當下顯示為準。',
      },
      {
        q: '轉帳後要怎麼確認訂單？',
        a: '完成轉帳後請在 LINE 回傳帳號後五碼供我們核對；訂單確認信也會寄送至您填寫的 Email。',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-moon-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
      />

      {/* Hero */}
      <section className="border-b border-moon-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 brand-section text-center">
          <div className="flex justify-center mb-6">
            <Eyebrow bordered>FAQ · 常見問題</Eyebrow>
          </div>
          <h1 className="brand-display text-2xl sm:text-3xl lg:text-4xl mb-6 leading-snug">
            訂購前想先確認的事，
            <br className="hidden sm:block" />
            我們整理在這裡。
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            找不到答案？可以直接透過頁尾的 LINE 官方帳號聯繫月島甜點。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {FAQ_GROUPS.map((group, groupIndex) => (
          <section
            key={group.title}
            className={`brand-section ${groupIndex > 0 ? 'border-t border-moon-border/40' : ''}`}
          >
            <SectionHeading className="mb-8 sm:mb-12" title={group.title} />
            <div className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.q}
                  className="border border-moon-border/40 bg-moon-dark/30 p-5 sm:p-6"
                >
                  <h3 className="brand-body text-sm sm:text-base text-moon-text mb-2">
                    {item.q}
                  </h3>
                  <p className="brand-body text-xs sm:text-sm text-moon-muted/90">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="brand-section border-t border-moon-border/40 text-center">
          <p className="brand-body text-base sm:text-lg text-moon-text mb-6">
            準備好了嗎？直接挑一塊適合現在的甜點。
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
