import type { MenuItemWithVariants, MenuCategory } from '@/lib/supabase'
import { checkDailyCapacity, type CapacityResult } from '@/src/repositories/product.repository'

export type { CapacityResult }

export interface MenuCatalog {
  categories: MenuCategory[]
  items: MenuItemWithVariants[]
}

/**
 * 取得完整菜單目錄（分類 + 品項）
 * @returns MenuCatalog 物件
 */
export async function getMenuCatalog(): Promise<MenuCatalog> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 驗證購物車內的品項是否全部有效且上架中
 * @param itemIds - 品項 UUID 陣列
 * @returns 無效品項的 ID 陣列（空陣列代表全部有效）
 */
export async function validateCartItems(itemIds: string[]): Promise<string[]> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 查詢指定日期與取貨方式的產能狀況
 * 若 RPC 無回傳，回傳安全的預設值（可預訂）
 * @param date - ISO 日期字串，格式 YYYY-MM-DD
 * @param deliveryMethod - 取貨方式，預設 'pickup'
 * @returns CapacityResult
 */
export async function getAvailableCapacity(
  date: string,
  deliveryMethod: string = 'pickup'
): Promise<CapacityResult> {
  const result = await checkDailyCapacity(date, deliveryMethod)
  return result ?? {
    date,
    current_count: 0,
    capacity_limit: 5,
    available: true,
    reason: '可以預訂',
  }
}
