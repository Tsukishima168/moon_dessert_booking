/**
 * ProductNotice — 固定但書組件（P0-3）
 * 掛在商品詳情頁購買區下方，三句固定文案：
 *   1. 預購前置天數（吃 lead_time_days，無值則不顯示該句）
 *   2. 急件/客製導客到門市或官方 LINE（全站固定顯示）
 *   3. 保存方式、成分、過敏原請私訊 LINE 詢問（暫行；商品資料補齊後可移除，全站固定顯示）
 * LINE 連結沿用 repo 既有值（components/Footer.tsx、app/order/cancel、app/order/error、app/refund 皆使用同一組 @931cxefd 帳號連結）。
 */

const OFFICIAL_LINE_URL = 'https://line.me/R/ti/p/@931cxefd';
// 保存方式／成分／過敏原目前沒有放在商品資料裡，統一請客人私訊 LINE（同一個官方帳號的短連結，與 /faq、/shipping、/terms 一致）。
const LINE_INQUIRY_URL = 'https://lin.ee/MndRHE2';

interface ProductNoticeProps {
  leadTimeDays?: number | null;
}

export default function ProductNotice({ leadTimeDays }: ProductNoticeProps) {
  return (
    <div className="border border-moon-border/40 bg-moon-dark/30 p-4 sm:p-5 space-y-2">
      {typeof leadTimeDays === 'number' && leadTimeDays > 0 && (
        <p className="brand-body text-xs sm:text-sm text-moon-muted/90">
          本品預訂準備時間：{leadTimeDays} 天；可選取貨日期請查看結帳頁。
        </p>
      )}
      <p className="brand-body text-xs sm:text-sm text-moon-muted/90">
        急件、保存資訊或客製需求，請先透過
        <a
          href={OFFICIAL_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-moon-accent hover:underline"
        >
          官方 LINE
        </a>
        確認能否安排與商品說明。
      </p>
      <p className="brand-body text-xs sm:text-sm text-moon-muted/90">
        保存方式、成分與過敏原，請私訊
        <a
          href={LINE_INQUIRY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-moon-accent hover:underline"
        >
          LINE
        </a>
        詢問。
      </p>
    </div>
  );
}
