import { createAdminClient } from '@/lib/supabase-admin'
import type { Order, OrderItem } from '@/lib/supabase'

export interface InsertOrderPayload {
  order_id: string
  customer_name: string
  phone: string
  email: string | null
  pickup_time: string
  items: OrderItem[]
  total_price: number
  original_price: number
  final_price: number
  discount_amount: number
  promo_code: string | null
  payment_date: string | null
  delivery_method: string
  delivery_address: string | null
  delivery_fee: number
  delivery_notes: string | null
  mbti_type: string | null
  from_mbti_test: boolean
  source_from: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  user_id: string | null
  status: string
}

/**
 * 將訂單資料寫入 orders 資料表（使用 admin client 繞過 RLS）
 * @param payload - 完整的訂單欄位
 */
export async function insertOrder(payload: InsertOrderPayload): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('orders').insert(payload)
  if (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
}

/**
 * 依訂單 ID 查詢單筆訂單
 * @param orderId - 訂單 ID（格式 ORD{timestamp}）
 * @returns Order 物件，找不到時回傳 null
 */
export async function findOrderById(orderId: string): Promise<Order | null> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 依用戶 ID 查詢該用戶所有訂單（依建立時間降序）
 * @param userId - Supabase auth user ID
 * @returns Order 陣列
 */
export async function findOrdersByUserId(userId: string): Promise<Order[]> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 更新訂單狀態
 * @param orderId - 訂單 ID
 * @param status - 目標狀態字串
 */
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 查詢指定日期的已確認訂單數量（用於座位容量計算）
 * @param date - ISO 日期字串，格式 YYYY-MM-DD
 * @returns 訂單數量
 */
export async function countConfirmedOrdersByDate(date: string): Promise<number> {
  // TODO: implement
  throw new Error('Not implemented')
}
