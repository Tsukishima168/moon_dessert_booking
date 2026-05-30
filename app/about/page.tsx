import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '品牌故事 — 月島 × Kiwimu',
  description:
    '月島甜點是台南安南區本原街的甜點工作室，結合 Kiwimu MBTI 的人格甜點宇宙。從情緒與狀態出發，為你現在的狀態找到一塊適合的甜點。本原街自取或宅配到府。',
  alternates: { canonical: '/about' },
  openGraph: {
    title: '品牌故事 — 月島 × Kiwimu | MOON MOON 月島甜點',
    description:
      '台南安南區本原街甜點工作室 × Kiwimu 人格甜點宇宙。從情緒與狀態出發的甜點設計。',
    url: 'https://shop.kiwimu.com/about',
    type: 'article',
  },
};

// FAQPage 結構化資料 — 供 AI 搜尋引擎與 Google rich result 引用（公開品牌資訊）
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
  ],
};

const TRIANGLE = [
  { label: 'KIWIMU', desc: '核心入口。安靜、被看見，所有故事的起點與收束。' },
  { label: 'BASCAT', desc: '帶著一點不正經——知道規則，但選擇不遵守。讓人想截圖、想分享。' },
  { label: 'LEMONDAY', desc: '帶點酸，卻不是惡意。說出大家想說、卻不敢說的那句話。' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-moon-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="border-b border-moon-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 brand-section text-center">
          <div className="flex justify-center mb-6">
            <Eyebrow bordered>ABOUT · KIWIMU UNIVERSE</Eyebrow>
          </div>
          <h1 className="brand-display text-2xl sm:text-3xl lg:text-4xl mb-6 leading-snug">
            月島還是一間甜點店，
            <br className="hidden sm:block" />
            只是我們先問：你現在是什麼狀態？
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            甜點在這裡不只是口味，而是為某種情緒、某個即將發生的時刻，準備的一個可食的道具。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Kiwimu 入口 */}
        <section className="brand-section">
          <div className="flex flex-col items-center text-center gap-6">
            <Image
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768736617/mbti_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_zpt5jq.webp"
              alt="Kiwimu — 月島的奶霜生物"
              width={160}
              height={160}
              className="h-24 sm:h-28 w-auto opacity-90"
            />
            <Eyebrow>KIWIMU · 入口</Eyebrow>
            <h2 className="brand-body text-lg sm:text-xl lg:text-2xl text-moon-text max-w-2xl">
              Kiwimu 是這一切的入口 —— 一團從鮮奶油誕生、會融化也會重新打發成形的奶霜生物。
            </h2>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90 max-w-2xl">
              牠不急著解釋自己，只是安靜地待在那裡；存在感很輕，卻有重量。情緒一來就會融化，
              <span className="text-moon-gold">
                但只要願意停下來面對、命名、整理，牠就又能被重新打發成形。
              </span>
              Kiwimu 承載的，是「被看見」這件事——也是月島對外的第一張臉。
            </p>
          </div>
        </section>

        {/* MBTI 甜點哲學 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="情緒，先於口味" subtitle="MBTI × 甜點的設計哲學" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              在月島，我們不先問你喜歡什麼口味，先問：你現在是什麼狀態？每一塊甜點，都是為一種情緒、一個即將發生的行動而設計，而不只是一個甜味。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              測驗與標籤從來不是最後的答案，只是一面鏡子。它幫我們確認：你最近，比較需要哪一種情緒，被安放在甜點裡。
            </p>
          </div>
        </section>

        {/* 在地 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="安南區・本原街" subtitle="月島在台南的座標" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              月島落在台南市安南區本原街一段 97 巷，果菜市場的邊上。這裡不是觀光大街，而是日常會經過的地方——就像甜點本來該有的位置。
            </p>
            <p className="brand-body text-sm sm:text-base text-moon-muted/90">
              本季品項依網站當季供應，可選擇本原街自取，或宅配到府。
            </p>
          </div>
        </section>

        {/* 宇宙三角 */}
        <section className="brand-section border-t border-moon-border/40">
          <SectionHeading className="mb-8 sm:mb-12" title="不只一個角色" subtitle="Kiwimu Universe 現在的重心" />
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {TRIANGLE.map((c) => (
              <div key={c.label} className="border border-moon-border/40 bg-moon-dark/30 p-5 sm:p-6 text-center">
                <div className="flex justify-center mb-3">
                  <Eyebrow>{c.label}</Eyebrow>
                </div>
                <p className="brand-body text-xs sm:text-sm text-moon-muted/90">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="brand-section border-t border-moon-border/40 text-center">
          <p className="brand-body text-base sm:text-lg text-moon-text mb-6">
            想從一塊甜點，開始認識月島？
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
