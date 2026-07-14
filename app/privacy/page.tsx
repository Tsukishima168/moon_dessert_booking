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

type PrivacySection = { title: string; body: string; grounded?: boolean };

const SECTIONS: PrivacySection[] = [
  {
    title: '蒐集之個人資料類別',
    body: '結帳時我們會請您填寫：姓名、聯絡電話、Email；選擇宅配時另需填寫縣市／區域／詳細地址；您也可以填寫訂單備註，並可選擇是否同意接收行銷資訊（可隨時退訂）。',
    grounded: true,
  },
  {
    title: '蒐集目的與利用方式',
    body: '【待補：個人資料蒐集之特定目的（依個資法應標明之項目）與利用範圍，需法遵確認後填入。】',
  },
  {
    title: '資料保存期限',
    body: '【待補：訂單與會員資料保存期限，需法遵確認。】',
  },
  {
    title: 'Cookie 與追蹤技術',
    body: '本站使用 Google Analytics（GA4）與 Facebook Pixel 進行網站流量分析與廣告成效追蹤，這些工具可能會在您的裝置上存放 Cookie。',
    grounded: true,
  },
  {
    title: '資料之第三方提供與國際傳輸',
    body: '【待補：是否有將資料提供予配送、金流（LINE Pay）等第三方之細節與國際傳輸情形，需法遵確認。】',
  },
  {
    title: '當事人權利',
    body: '【待補：查詢、更正、刪除個人資料之權利行使方式，需法遵確認。】',
  },
  {
    title: '聯絡方式',
    body: '【待補：個資保護聯絡窗口 Email／電話，目前原始碼未查得固定客服信箱，需 Penso 提供。如需立即協助，可先透過頁尾 LINE 官方帳號聯繫。】',
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
            本頁版型優先上線；帶【待補】標記的段落為法遵文字，仍待 Penso 或法務確認後填入。
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
                className={`brand-body text-sm sm:text-base ${
                  section.grounded ? 'text-moon-muted/90' : 'text-moon-gold'
                }`}
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
