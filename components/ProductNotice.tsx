/**
 * ProductNotice — 固定但書組件（P0-3）
 * 掛在商品詳情頁購買區下方，兩句固定文案：
 *   1. 預購前置天數（吃 lead_time_days，無值則不顯示該句）
 *   2. 急件/客製導客到門市或官方 LINE（全站固定顯示）
 * LINE 連結沿用 repo 既有值（components/Footer.tsx、app/order/cancel、app/order/error、app/refund 皆使用同一組 @931cxefd 帳號連結）。
 */

const OFFICIAL_LINE_URL = 'https://line.me/R/ti/p/@931cxefd';

interface ProductNoticeProps {
  leadTimeDays?: number | null;
}

export default function ProductNotice({ leadTimeDays }: ProductNoticeProps) {
  return (
    <div className="border border-moon-border/40 bg-moon-dark/30 p-4 sm:p-5 space-y-2">
      {typeof leadTimeDays === 'number' && leadTimeDays > 0 && (
        <p className="brand-body text-xs sm:text-sm text-moon-muted/90">
          本品需提前 {leadTimeDays} 個工作日預訂。
        </p>
      )}
      <p className="brand-body text-xs sm:text-sm text-moon-muted/90">
        急件或客製需求，請洽門市或
        <a
          href={OFFICIAL_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-moon-accent hover:underline"
        >
          官方 LINE
        </a>
        。
      </p>
    </div>
  );
}
