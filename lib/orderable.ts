/**
 * 線上可訂購的價格：有限數字且大於 0。
 * 價格為 0 的品項／規格是門市展示或門市限定，不得加入購物車或建立訂單
 * （2026-10-17 稽核：小山園抹茶拿鐵「一般」規格 $0 可加購並下單）。
 */
export function isOrderablePrice(price: unknown): boolean {
  const value = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(value) && value > 0;
}

/**
 * 可線上訂購的規格，並排成「由小到大」：
 * 1. 後台有設 sort_order 就照它（店主明確排序優先）；
 * 2. sort_order 相同（目前多規格商品全是 0）再依價格由小到大；價格也相同則維持原順序。
 * 規格預設選第一個，所以預設會是最小規格，與標題的「$N 起」一致（2026-10-27 內容檢核 S4：
 * 4 款提拉米蘇原本預設「鐵盒 $450」，標題卻寫「$170 起」）。純前端排序，不改資料庫。
 */
export function getOrderableVariants<T extends { price: unknown; sort_order?: number | null }>(
  variants: readonly T[]
): T[] {
  return variants
    .filter((variant) => isOrderablePrice(variant.price))
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || Number(a.price) - Number(b.price)
    );
}

// 飲品現做、冷熱當場決定：一律門市供應，不開放線上訂購（Penso 2026-10-18）。
// 判斷式與首頁既有的飲品分類判斷一致（app/page.tsx）。
const STORE_ONLY_CATEGORY = /drink|飲品|飲料/i;

export function isStoreOnlyCategory(category: unknown): boolean {
  return typeof category === 'string' && STORE_ONLY_CATEGORY.test(category);
}
