// 配送方式標籤（P2-lite）：對應 lib/supabase.ts 的 MenuItem.delivery_type。
// 單一來源，供商品卡片（ProductRow/ProductListItem）、商品詳情頁與結帳頁共用，避免各自重複判斷字串。
import { isStoreOnlyCategory } from '@/lib/orderable';

export type DeliveryType = 'pickup_only' | 'delivery_ok' | 'both';

// 2026-10-23 Penso 定案：千層／提拉米蘇／巴斯克可宅配；戚風、布丁僅自取；飲品僅門市提供。
// 實際值存在 menu_items.delivery_type，後台「配送方式」可逐品調整。
//
// deliveryAvailable：全站宅配總開關（business_settings.delivery_settings.delivery_available）。
// 總開關關閉時，結帳頁的宅配選項是「暫停開放」，商品就不能再標「可宅配」（2026-10-27 內容檢核 M1）。
// 預設 true＝與舊行為相同；呼叫端讀不到設定時也傳 true（與結帳頁、後端 getDeliverySettings 的預設一致）。
export function getDeliveryTypeLabel(
  deliveryType?: DeliveryType | string | null,
  category?: string | null,
  deliveryAvailable: boolean = true
): string | null {
  if (isStoreOnlyCategory(category)) return '僅門市提供';
  switch (deliveryType) {
    case 'pickup_only':
      return '僅自取';
    case 'delivery_ok':
    case 'both':
      return deliveryAvailable ? '可宅配' : null;
    default:
      return null;
  }
}

// 從公開 GET /api/settings 的回傳（raw key-value）判斷宅配總開關。
// 只有 delivery_settings.delivery_available 明確為 false 才算關閉；讀不到／格式不符一律視為開放，
// 與 app/checkout/page.tsx、src/services/settings.service.ts 的預設一致，不因設定讀取失敗而誤藏標籤。
export function isDeliveryAvailableInSettings(settings: unknown): boolean {
  if (typeof settings !== 'object' || settings === null) return true;
  const ds = (settings as Record<string, unknown>).delivery_settings;
  if (typeof ds !== 'object' || ds === null) return true;
  return (ds as Record<string, unknown>).delivery_available !== false;
}

export function isPickupOnlyItem(
  deliveryType?: DeliveryType | string | null,
  category?: string | null
): boolean {
  return deliveryType === 'pickup_only' || isStoreOnlyCategory(category);
}
