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
    title: '網站服務',
    body: '本站提供月島甜點商品瀏覽、線上預訂與訂單查詢。訂購前請閱讀商品說明，並確認您需要的品項、規格、數量與取貨方式。',
  },
  {
    title: '帳號與訂購',
    body: '您可以以訪客身分訂購，也可以透過 Kiwimu Passport 登入後查看會員資料與訂單。請使用可聯繫到您的姓名、電話與 Email，送出訂單前再次確認內容。',
  },
  {
    title: '商品與價格',
    body: '可訂購品項、規格與價格請查看商品頁及結帳明細。若商品未開放預訂，或有成分、過敏原及客製需求，請先透過 LINE 確認。',
  },
  {
    title: '付款與訂單確認',
    body: '請使用結帳頁提供的付款方式，並依訂單畫面確認金額及付款資訊。銀行轉帳後請透過 LINE 提供訂單編號與帳號後五碼，供我們核對。未收到確認或付款狀態不明時，請先查詢原訂單，避免重複付款。',
  },
  {
    title: '取貨與配送',
    body: '請依訂單選擇的日期及時段安排取貨。宅配是否開放、可配送地點、運費及到貨安排，請在訂購前確認；特殊需求請透過 LINE 聯繫。',
  },
  {
    title: '訂單變更與售後',
    body: '如需取消、更改訂單或反映商品問題，請查看退換貨政策頁，並透過 LINE 提供訂單編號與需求。',
  },
  {
    title: '網站與品牌內容',
    body: '如需使用月島甜點或 Kiwimu 的網站文字、照片與角色圖像，請先透過 LINE 聯繫，確認授權及使用方式。',
  },
  {
    title: '聯絡我們',
    body: '訂購、取貨、付款或網站使用有疑問，請透過 LINE 官方帳號 @931cxefd 聯繫月島甜點。',
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
            訂購前請確認商品、付款及取貨資訊。有特殊需求或訂單問題，歡迎透過 LINE 聯繫月島甜點。
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
      </div>
    </div>
  );
}
