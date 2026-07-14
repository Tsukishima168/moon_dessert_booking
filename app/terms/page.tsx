import type { Metadata } from 'next';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '服務條款｜月島甜點',
  description: '月島甜點網站服務條款。',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: '服務條款｜月島甜點 | MOON MOON 月島甜點',
    description: '月島甜點網站服務條款。',
    url: 'https://shop.kiwimu.com/terms',
    type: 'article',
  },
};

type TermsSection = { title: string; body: string };

const SECTIONS: TermsSection[] = [
  {
    title: '適用範圍',
    body: '【待補：本條款適用對象與生效方式，需 Penso 或法務確認後填入。】',
  },
  {
    title: '帳號與訂購',
    body: '【待補：會員帳號使用規範、訂購成立時點、訂單金額與內容以結帳頁當下顯示為準等條文，需法遵確認。】',
  },
  {
    title: '商品與價格',
    body: '【待補：商品內容以網站當下顯示為準、缺貨或價格異動處理方式等條文，需法遵確認。】',
  },
  {
    title: '付款',
    body: '【待補：付款方式（LINE Bank 轉帳／LINE Pay，實際依結帳頁顯示）、付款期限、逾期未付款處理方式，需法遵確認。】',
  },
  {
    title: '智慧財產權',
    body: '【待補：網站內容、Kiwimu 品牌與角色圖像之著作權/商標歸屬與使用限制，需法遵確認。】',
  },
  {
    title: '責任限制',
    body: '【待補：不可抗力、系統中斷、第三方服務（LINE Pay、金流商）之責任範圍，需法遵確認。】',
  },
  {
    title: '準據法與管轄法院',
    body: '【待補：準據法與管轄法院約定，需法遵確認。】',
  },
  {
    title: '條款修改',
    body: '【待補：條款修改公告方式與生效時點，需法遵確認。】',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-moon-black">
      {/* Hero */}
      <section className="border-b border-moon-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 brand-section text-center">
          <div className="flex justify-center mb-6">
            <Eyebrow bordered>TERMS · 服務條款</Eyebrow>
          </div>
          <h1 className="brand-display text-2xl sm:text-3xl lg:text-4xl mb-6 leading-snug">
            服務條款
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            本頁版型優先上線；法遵文字內容仍待 Penso 或法務確認後填入，目前章節僅為架構占位。
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
      </div>
    </div>
  );
}
