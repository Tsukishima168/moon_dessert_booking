import type { ReactNode } from 'react';

/**
 * SectionHeading — 品牌區段標題（裝飾線 + 置中標題 + 可選副標）
 * 收斂首頁重複的 divider+heading 樣式，統一識別。沿用 brand-title / brand-subtitle 語氣。
 */
export default function SectionHeading({
  title,
  subtitle,
  icon,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 sm:mb-4">
        <span className="h-px bg-moon-border flex-1 max-w-[80px] sm:max-w-xs" />
        <h2 className="brand-title text-xl sm:text-2xl flex items-center gap-2 sm:gap-3 whitespace-nowrap">
          {icon}
          {title}
        </h2>
        <span className="h-px bg-moon-border flex-1 max-w-[80px] sm:max-w-xs" />
      </div>
      {subtitle && <p className="brand-subtitle px-4">{subtitle}</p>}
    </div>
  );
}
