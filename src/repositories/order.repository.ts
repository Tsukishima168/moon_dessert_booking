import { createAdminClient } from '@/lib/supabase-admin'
import type { Order, OrderItem } from '@/lib/supabase'

// 後台完整訂單型別（含新欄位）
export interface AdminOrder {
  id: string
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
  payment_method: string | null
  linepay_transaction_id: string | null
  delivery_method: string
  delivery_address: string | null
  delivery_fee: number
  delivery_notes: string | null
  admin_notes: string | null
  status: string
  created_at: string
  updated_at: string | null
}

export interface UpdateOrderPayload {
  pickup_time?: string
  items?: OrderItem[]
  total_price?: number
  original_price?: number
  final_price?: number
  discount_amount?: number
  promo_code?: string | null
  payment_method?: string | null
  linepay_transaction_id?: string | null
  status?: string
  admin_notes?: string | null
  updated_at?: string
}

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
  linepay_transaction_id: string | null
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
export async function insertOrder(payload: InsertOrderPayload): Promise<AdminOrder> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('orders')
    .insert(payload)
    .select('*')
    .single()
  if (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
  return data as AdminOrder
}

/**
 * 依訂單 ID 查詢單筆訂單（後台完整欄位）
 * @param orderId - 訂單 ID（格式 ORD{timestamp}）
 * @returns AdminOrder 物件，找不到時回傳 null
 */
export async function findOrderById(orderId: string): Promise<AdminOrder | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw error
  return data as AdminOrder | null
}

/**
 * 更新訂單欄位（後台管理用）
 * @param orderId - 訂單 ID
 * @param payload - 要更新的欄位（部分更新）
 * @returns 更新後的 AdminOrder
 */
export async function updateOrder(
  orderId: string,
  payload: UpdateOrderPayload
): Promise<AdminOrder> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('orders')
    .update(payload)
    .eq('order_id', orderId)
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`訂單 ${orderId} 不存在`)
  return data as AdminOrder
}

/**
 * 依用戶 ID 查詢該用戶所有訂單（依建立時間降序）
 * @param userId - Supabase auth user ID
 * @returns Order 陣列
 */
export async function findOrdersByUserId(userId: string): Promise<Order[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Order[]
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
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('order_id', orderId)
  if (error) throw error
}

/**
 * 查詢指定日期的已確認訂單數量（用於座位容量計算）
 * @param date - ISO 日期字串，格式 YYYY-MM-DD
 * @returns 訂單數量
 */
export async function countConfirmedOrdersByDate(date: string): Promise<number> {
  const adminClient = createAdminClient()
  const { count, error } = await adminClient
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .like('pickup_time', `${date}%`)
    .in('status', ['pending', 'paid', 'confirmed', 'preparing', 'ready'])
  if (error) throw error
  return count ?? 0
}

/**
 * 查詢訂單列表（後台用），支援狀態篩選與筆數上限
 * @param status - 狀態篩選，'all' 或 undefined 表示不篩選
 * @param limit - 回傳筆數上限，預設 100
 * @returns Order 陣列
 */
export async function findOrders(
  status?: string,
  limit: number = 100
): Promise<Order[]> {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Order[]
}
