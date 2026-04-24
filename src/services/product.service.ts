import type { DateAvailability } from '@/lib/supabase'
import {
  checkDailyCapacity,
  validateReservationDate,
  checkMenuItemAvailability,
  findAvailableDates,
  type CapacityResult,
  type ReservationValidation,
} from '@/src/repositories/product.repository'

export type { CapacityResult, ReservationValidation }

/**
 * 驗證預訂日期是否符合規則，RPC 無回傳時給予寬鬆預設值
 * @param date - ISO 日期字串，格式 YYYY-MM-DD
 * @param isRushOrder - 是否為急單，預設 false
 * @returns ReservationValidation
 */
export async function validateReservation(
  date: string,
  isRushOrder: boolean = false
): Promise<ReservationValidation> {
  const result = await validateReservationDate(date, isRushOrder)
  return result ?? {
    valid: true,
    reason: '符合預訂規則',
    min_date: null,
    max_date: null,
  }
}

/**
 * 查詢菜單品項在指定日期的可用性
 * Fail-closed：RPC 失敗時回傳不可用，避免超賣或錯誤放行
 * @param date - 配送/取貨日期 ISO 字串
 * @param menuItemId - 指定品項 UUID，null 表示查詢全部
 * @returns RPC 回傳資料，或失敗時的 fail-safe 預設值
 */
export async function getMenuItemAvailability(
  date: string,
  menuItemId: string | null
): Promise<unknown> {
  try {
    return await checkMenuItemAvailability(date, menuItemId)
  } catch {
    return { available: false, reason: '系統暫時無法確認可用性，請稍後再試' }
  }
}

/**
 * 查詢指定日期與取貨方式的產能狀況
 * 若 RPC 失敗或無回傳，fail-closed 避免前台誤放行不可驗證的日期
 * @param date - ISO 日期字串，格式 YYYY-MM-DD
 * @param deliveryMethod - 取貨方式，預設 'pickup'
 * @returns CapacityResult
 */
export async function getAvailableCapacity(
  date: string,
  deliveryMethod: 'pickup' | 'delivery' = 'pickup'
): Promise<CapacityResult> {
  try {
    const result = await checkDailyCapacity(date, deliveryMethod)
    if (result) {
      return result
    }
  } catch {
    // Fall through to fail-closed response below.
  }

  return {
    date,
    current_count: 0,
    capacity_limit: 0,
    available: false,
    reason: '目前無法確認當日產能，請稍後再試',
  }
}

/**
 * 取得指定日期範圍的可預訂日期清單
 * 錯誤時回傳空陣列，不阻擋前台顯示
 * @param startDate - 起始日期 YYYY-MM-DD
 * @param endDate - 結束日期 YYYY-MM-DD
 * @param deliveryMethod - 取貨方式，預設 'pickup'
 * @returns DateAvailability 陣列
 */
export async function getAvailableDateRange(
  startDate: string,
  endDate: string,
  deliveryMethod: 'pickup' | 'delivery' = 'pickup'
): Promise<DateAvailability[]> {
  try {
    return await findAvailableDates(startDate, endDate, deliveryMethod)
  } catch {
    return []
  }
}
