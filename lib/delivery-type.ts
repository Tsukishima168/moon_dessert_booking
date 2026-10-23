// 配送方式標籤（P2-lite）：對應 lib/supabase.ts 的 MenuItem.delivery_type。
// 單一來源，供商品卡片（ProductRow/ProductListItem）、商品詳情頁與結帳頁共用，避免各自重複判斷字串。
import { isStoreOnlyCategory } from '@/lib/orderable';

export type DeliveryType = 'pickup_only' | 'delivery_ok' | 'both';

// 2026-10-23 Penso 定案：千層／提拉米蘇／巴斯克可宅配；戚風、布丁僅自取；飲品僅門市提供。
// 實際值存在 menu_items.delivery_type，後台「配送方式」可逐品調整。
export function getDeliveryTypeLabel(
  deliveryType?: DeliveryType | string | null,
  category?: string | null
): string | null {
  if (isStoreOnlyCategory(category)) return '僅門市提供';
  switch (deliveryType) {
    case 'pickup_only':
      return '僅自取';
    case 'delivery_ok':
    case 'both':
      return '可宅配';
    default:
      return null;
  }
}

export function isPickupOnlyItem(
  deliveryType?: DeliveryType | string | null,
  category?: string | null
): boolean {
  return deliveryType === 'pickup_only' || isStoreOnlyCategory(category);
}
