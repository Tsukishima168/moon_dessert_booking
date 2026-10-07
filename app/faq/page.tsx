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
        text: '月島甜點位於台南市安南區本原街一段 97 巷 168 號，果菜市場周邊，可預訂本原街自取；宅配是否開放與可配送地點，請在訂購前確認。',
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
        text: '在 shop.kiwimu.com 選擇甜點與規格、加入購物車、前往結帳，選擇當時開放的日期與取貨方式；宅配地點請先透過 LINE 確認。',
      },
    },
    {
      '@type': 'Question',
      name: '自取地點與時間是？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '自取地點為台南市安南區本原街一段 97 巷 168 號（月島甜點店）。週一公休；週二至五 13:00–18:00；週六日 11:00–18:00。臨時異動請看月島公告；預訂取貨請從結帳頁開放的日期與時段選擇，並依訂單內容取貨。',
      },
    },
    {
      '@type': 'Question',
      name: '有哪些付款方式？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '目前支援 LINE Bank 銀行轉帳，LINE Pay 是否可用請查看結帳頁；實際可用方式以結帳頁當下顯示為準。',
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
        a: '月島甜點位於台南市安南區本原街一段 97 巷 168 號，果菜市場周邊，可預訂本原街自取；宅配是否開放與可配送地點，請在訂購前確認。',
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
        a: '在 shop.kiwimu.com 選擇甜點與規格、加入購物車、前往結帳，選擇當時開放的日期與取貨方式；宅配地點請先透過 LINE 確認。',
      },
    ],
  },
  {
    title: '自取與宅配',
    items: [
      {
        q: '自取地點與時間是？',
        a: '自取地點為台南市安南區本原街一段 97 巷 168 號（月島甜點店）。週一公休；週二至五 13:00–18:00；週六日 11:00–18:00。臨時異動請看月島公告；預訂取貨請從結帳頁開放的日期與時段選擇，並依訂單內容取貨。',
      },
      {
        q: '宅配範圍與運費怎麼算？',
        a: '宅配是否開放、運費與免運門檻請查看結帳頁。下單前請透過 LINE 提供收件縣市、區域及希望到貨日期，確認是否可以配送與相關費用。',
      },
      {
        q: '需要提前多久預訂？',
        a: '請從結帳頁可選的日期安排預訂。不同品項所需準備時間可能不同，急件請先透過 LINE 確認能否安排。',
      },
    ],
  },
  {
    title: '保存與售後',
    items: [
      {
        q: '甜點怎麼保存？可以放多久？',
        a: '請查看商品頁及取貨時提供的保存說明。不同品項的保存溫度與期限不同，未找到資訊時，請透過 LINE 提供品名詢問。',
      },
      {
        q: '可以客製化甜點嗎（插卡、蠟燭、寫字等）？',
        a: '請先透過 LINE 告訴我們需要的品項、日期與客製內容，確認是否可以安排及金額，再決定是否訂購。',
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
        a: '目前支援 LINE Bank 銀行轉帳，LINE Pay 是否可用請查看結帳頁；實際可用方式與轉帳資訊以結帳頁當下顯示為準。',
      },
      {
        q: '轉帳後要怎麼確認訂單？',
        a: '完成轉帳後請在 LINE 回傳帳號後五碼供我們核對；訂單通知會使用您填寫的 Email；未收到通知時，也可透過 LINE 提供訂單編號確認。',
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
