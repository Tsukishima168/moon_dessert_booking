import { createClient } from '@/lib/supabase-server'
import type { MenuItem, MenuItemWithVariants, MenuCategory } from '@/lib/supabase'

export interface CapacityResult {
  date: string
  current_count: number
  capacity_limit: number
  available: boolean
  reason: string
}

/**
 * 呼叫 Supabase RPC 查詢指定日期的產能狀況
 * @param date - ISO 日期字串，格式 YYYY-MM-DD
 * @param deliveryMethod - 取貨方式 'pickup' | 'delivery'
 * @returns CapacityResult，RPC 無回傳時為 null
 */
export async function checkDailyCapacity(
  date: string,
  deliveryMethod: string
): Promise<CapacityResult | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('check_daily_capacity', {
    check_date: date,
    delivery_method_param: deliveryMethod,
  })
  if (error) {
    console.error('checkDailyCapacity error:', error)
    throw error
  }
  return (data?.[0] as CapacityResult) ?? null
}

/**
 * 查詢所有上架中的菜單品項
 * @returns MenuItem 陣列（含分類、變體）
 */
export async function findAllActiveMenuItems(): Promise<MenuItemWithVariants[]> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 依品項 ID 查詢單一菜單品項
 * @param itemId - 品項 UUID
 * @returns MenuItemWithVariants，找不到時回傳 null
 */
export async function findMenuItemById(
  itemId: string
): Promise<MenuItemWithVariants | null> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 查詢所有菜單分類
 * @returns MenuCategory 陣列（依排序欄位升序）
 */
export async function findAllCategories(): Promise<MenuCategory[]> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 批次查詢多個品項（用於訂單驗證）
 * @param itemIds - 品項 UUID 陣列
 * @returns MenuItem 陣列
 */
export async function findMenuItemsByIds(itemIds: string[]): Promise<MenuItem[]> {
  // TODO: implement
  throw new Error('Not implemented')
}
