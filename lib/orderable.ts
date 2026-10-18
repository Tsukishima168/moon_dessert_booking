/**
 * 線上可訂購的價格：有限數字且大於 0。
 * 價格為 0 的品項／規格是門市展示或門市限定，不得加入購物車或建立訂單
 * （2026-10-17 稽核：小山園抹茶拿鐵「一般」規格 $0 可加購並下單）。
 */
export function isOrderablePrice(price: unknown): boolean {
  const value = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(value) && value > 0;
}

export function getOrderableVariants<T extends { price: unknown }>(variants: readonly T[]): T[] {
  return variants.filter((variant) => isOrderablePrice(variant.price));
}

// 飲品現做、冷熱當場決定：一律門市供應，不開放線上訂購（Penso 2026-10-18）。
// 判斷式與首頁既有的飲品分類判斷一致（app/page.tsx）。
const STORE_ONLY_CATEGORY = /drink|飲品|飲料/i;

export function isStoreOnlyCategory(category: unknown): boolean {
  return typeof category === 'string' && STORE_ONLY_CATEGORY.test(category);
}
