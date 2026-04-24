import { createClient } from '@/lib/supabase-server'
import type { DateAvailability } from '@/lib/supabase'

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

export interface ReservationValidation {
  valid: boolean
  reason: string
  min_date: string | null
  max_date: string | null
}

/**
 * 呼叫 Supabase RPC 驗證預訂日期是否符合規則
 * @param date - ISO 日期字串，格式 YYYY-MM-DD
 * @param isRushOrder - 是否為急單
 * @returns ReservationValidation，RPC 無回傳時為 null
 */
export async function validateReservationDate(
  date: string,
  isRushOrder: boolean
): Promise<ReservationValidation | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('validate_reservation', {
    pickup_date: date,
    is_rush_order: isRushOrder,
  })
  if (error) {
    console.error('validateReservationDate error:', error)
    throw error
  }
  return (data?.[0] as ReservationValidation) ?? null
}

export interface MenuItemAvailability {
  available: boolean
  reason: string
}

/**
 * 呼叫 Supabase RPC 查詢菜單品項在指定日期的可用性
 * @param date - 配送/取貨日期 ISO 字串
 * @param menuItemId - 指定品項 UUID，null 表示查詢全部
 * @returns RPC 回傳的可用性資料（未知結構，呼叫端自行處理）
 */
export async function checkMenuItemAvailability(
  date: string,
  menuItemId: string | null
): Promise<unknown> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('check_menu_item_availability', {
    menu_item_id_param: menuItemId,
    delivery_date: date,
    current_time: new Date().toISOString(),
  })
  if (error) {
    console.error('checkMenuItemAvailability error:', error)
    throw error
  }
  return data
}

/**
 * 查詢指定日期範圍與取貨方式的可預訂日期清單（使用 server client）
 * @param startDate - 起始日期 YYYY-MM-DD
 * @param endDate - 結束日期 YYYY-MM-DD
 * @param deliveryMethod - 取貨方式 'pickup' | 'delivery'
 * @returns DateAvailability 陣列
 */
export async function findAvailableDates(
  startDate: string,
  endDate: string,
  deliveryMethod: 'pickup' | 'delivery'
): Promise<DateAvailability[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_available_dates', {
    start_date: startDate,
    end_date: endDate,
    delivery_method_param: deliveryMethod,
  })
  if (error) {
    console.error('findAvailableDates error:', error)
    throw error
  }
  return (data || []).map((item: Record<string, unknown>) => ({
    date: item.date as string,
    available: item.available as boolean,
    reason: item.reason as string | undefined,
    type: item.type as string | undefined,
    current_count: item.current_count as number | undefined,
    limit_count: item.limit_count as number | undefined,
  }))
}
