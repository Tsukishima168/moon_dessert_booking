// 配送方式標籤（P2-lite）：對應 lib/supabase.ts 的 MenuItem.delivery_type。
// 單一來源，供商品卡片（ProductRow/ProductListItem）與商品詳情頁共用，避免各自重複判斷字串。

export type DeliveryType = 'pickup_only' | 'delivery_ok' | 'both';

export function getDeliveryTypeLabel(
  deliveryType?: DeliveryType | string | null
): string | null {
  switch (deliveryType) {
    case 'pickup_only':
      return '限自取';
    case 'delivery_ok':
      return '可宅配';
    case 'both':
      return '可宅配/可自取';
    default:
      return null;
  }
}
