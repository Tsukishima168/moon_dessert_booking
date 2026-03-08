import type { Order } from '@/lib/supabase'

export interface RewardGrant {
  userId: string
  points: number
  reason: string
  orderId: string
}

/**
 * 訂單建立後發放點數獎勵（由 order.created 事件觸發，勿直接呼叫）
 * @param order - 已建立的訂單物件
 */
export async function grantOrderReward(order: Order): Promise<void> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 查詢用戶目前的點數餘額
 * @param userId - Supabase auth user ID
 * @returns 點數數字
 */
export async function getUserPoints(userId: string): Promise<number> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 扣除點數（兌換折抵時使用）
 * @param userId - Supabase auth user ID
 * @param points - 要扣除的點數
 * @param orderId - 關聯訂單 ID（audit log 用）
 */
export async function deductPoints(
  userId: string,
  points: number,
  orderId: string
): Promise<void> {
  // TODO: implement
  throw new Error('Not implemented')
}
