/**
 * 訂單建立事件監聽器 — 發放點數獎勵
 *
 * 由 EventBus 自動觸發，無需手動呼叫。
 * 冪等設計：重複觸發同一訂單不會重複加點（通過 orderId 去重）
 */

import { grantOrderReward } from '@/src/services/reward.service'
import type { Order } from '@/lib/supabase'

/**
 * order.created 事件監聽器
 * @param payload - { order: Order }
 */
export async function handleOrderCreated(payload: Record<string, unknown>): Promise<void> {
  const order = payload.order as Order | undefined

  if (!order) {
    console.warn('[RewardHandler] order.created event missing order payload')
    return
  }

  try {
    await grantOrderReward(order)
    console.log(`[RewardHandler] Successfully granted reward for order ${order.id}`)
  } catch (error) {
    console.error('[RewardHandler] Failed to grant reward for order', order.id, error)
    // 不 throw，因為點數發放是 fire-and-forget
  }
}
