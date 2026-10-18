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
