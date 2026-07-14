import Image from 'next/image';
import Link from 'next/link';

/**
 * Footer — 全站共用頁尾（原為 app/page.tsx 首頁內嵌區塊，抽成共用組件掛進 root layout）
 * 分區：購物說明 / 品牌 / 條款 / 聯絡與版權。沿用既有視覺語言（brand-eyebrow、moon-* token）。
 */

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const SHOPPING_LINKS: FooterLink[] = [
  { label: '常見問題', href: '/faq' },
  { label: '運送與取貨', href: '/shipping' },
  { label: '退換貨政策', href: '/refund' },
];

const BRAND_LINKS: FooterLink[] = [
  { label: '品牌故事', href: '/about' },
  { label: '門市資訊', href: '/location' },
  { label: '探索月島展覽地圖', href: 'https://map.kiwimu.com', external: true },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: '服務條款', href: '/terms' },
  { label: '隱私權政策', href: '/privacy' },
];

const CONTACT_LINKS: FooterLink[] = [
  { label: '聯繫月島甜點（LINE）', href: 'https://line.me/R/ti/p/@931cxefd', external: true },
  { label: 'Kiwimu 人格實驗室 ↗', href: 'https://kiwimu.com', external: true },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col items-center sm:items-start gap-3">
      <span className="brand-eyebrow">{title}</span>
      <ul className="flex flex-col items-center sm:items-start gap-2">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm tracking-wide text-moon-muted hover:text-moon-accent transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-xs sm:text-sm tracking-wide text-moon-muted hover:text-moon-accent transition-colors"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-moon-border mt-0 sm:mt-4 lg:mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* 四分區連結 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10 text-center sm:text-left mb-10 sm:mb-14">
          <FooterColumn title="購物說明" links={SHOPPING_LINKS} />
          <FooterColumn title="品牌" links={BRAND_LINKS} />
          <FooterColumn title="條款" links={LEGAL_LINKS} />
          <FooterColumn title="聯絡我們" links={CONTACT_LINKS} />
        </div>

        <div className="w-full h-px bg-moon-border mb-10 sm:mb-14" />

        <div className="text-center">
          {/* IP LOGO */}
          <div className="mb-6 sm:mb-8 flex justify-center">
            <Image
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768736617/mbti_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_zpt5jq.webp"
              alt="Kiwimu"
              width={120}
              height={120}
              className="h-20 sm:h-24 w-auto opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>

          {/* 品牌標誌 */}
          <div className="mb-4 flex justify-center">
            <Image
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png"
              alt="月島甜點"
              width={150}
              height={50}
              className="theme-logo h-8 w-auto opacity-60"
            />
          </div>

          {/* 版權資訊 */}
          <p className="brand-eyebrow mb-2">© 2024 MOON MOON DESSERT</p>
          <p className="brand-subtitle text-moon-muted/60">安南區本原街・果菜市場周邊療癒系甜點</p>
        </div>
      </div>
    </footer>
  );
}
