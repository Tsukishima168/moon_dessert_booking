import type { Metadata } from 'next';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: '隱私權政策｜月島甜點',
  description: '月島甜點網站隱私權政策：蒐集的個人資料類別、使用之分析工具與聯絡方式。',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: '隱私權政策｜月島甜點 | MOON MOON 月島甜點',
    description: '月島甜點網站隱私權政策。',
    url: 'https://shop.kiwimu.com/privacy',
    type: 'article',
  },
};

type PrivacySection = { title: string; body: string };

const SECTIONS: PrivacySection[] = [
  {
    title: '訂購資料',
    body: '結帳時會請您填寫姓名、聯絡電話與 Email；選擇宅配時另需提供縣市、區域及詳細地址。您也可以填寫訂單備註，並自行選擇是否接收優惠資訊。',
  },
  {
    title: '資料的用途',
    body: '您提供的訂購資料會用於處理訂單、核對付款、安排取貨或配送，以及聯繫訂單與售後事宜。登入後可查看您的會員資料及訂單。',
  },
  {
    title: '登入與網站儲存',
    body: '本站透過 Kiwimu Passport 提供會員登入，並使用瀏覽器儲存功能維持登入、購物車、主題及來源資訊。您可透過瀏覽器設定管理裝置上的網站資料。',
  },
  {
    title: '流量分析與優惠資訊',
    body: '本站使用 Google Analytics 分析網站瀏覽情形；啟用 Facebook Pixel 時，也會用於廣告成效追蹤。相關工具可能使用 Cookie。結帳時可選擇是否接收優惠資訊，行銷信件提供退訂連結。',
  },
  {
    title: '服務提供者',
    body: '網站使用 Supabase 及 Vercel 提供資料儲存、登入與網站服務，並透過 Resend 處理 Email 通知。選用 LINE Pay 付款時，付款所需資訊會交由 LINE Pay 處理。',
  },
  {
    title: '資料查詢與處理需求',
    body: '如需查詢、更正或刪除您提供的資料，或想了解訂單及會員資料的保存情形，請透過 LINE 聯繫我們，說明需求。請勿在公開留言中提供完整個人資料。',
  },
  {
    title: '聯絡方式',
    body: '個人資料或優惠訊息有疑問，請透過 LINE 官方帳號 @931cxefd 聯繫月島甜點。',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-moon-black">
      {/* Hero */}
      <section className="border-b border-moon-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 brand-section text-center">
          <div className="flex justify-center mb-6">
            <Eyebrow bordered>PRIVACY · 隱私權政策</Eyebrow>
          </div>
          <h1 className="brand-display text-2xl sm:text-3xl lg:text-4xl mb-6 leading-snug">
            隱私權政策
          </h1>
          <p className="brand-body text-sm sm:text-base text-moon-text/90 max-w-2xl mx-auto">
            這裡說明您在訂購與使用會員服務時提供的資料、網站使用的服務，以及資料相關問題的聯絡方式。
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
              <p
                className="brand-body text-sm sm:text-base text-moon-muted"
              >
                {section.body}
              </p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
