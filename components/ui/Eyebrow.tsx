import type { ReactNode } from 'react';

/**
 * Eyebrow — 品牌小標 motif（金色 bar + uppercase Latin 小標）
 * 收斂 hero / 故事區 / footer 散落的「▍LABEL」treatment，統一識別。
 * 金色 bar = 品牌「稀有金」訊號的克制落點（雙主題走 moon-gold token）。
 */
export default function Eyebrow({
  children,
  className = '',
  bordered = false,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${
        bordered ? 'border border-moon-border/70 bg-moon-dark/50 px-4 py-2 sm:px-5' : ''
      } ${className}`}
    >
      <span className="h-3.5 w-px bg-moon-gold" aria-hidden="true" />
      <span className="brand-eyebrow">{children}</span>
    </span>
  );
}
