/**
 * 訂單建立事件監聽器 — N8N 訂單同步
 *
 * 由 EventBus 自動觸發，無需手動呼叫。
 * 火焰忘卻模式：webhook 失敗不阻塞訂單流程，失敗記錄在 dead-letter log。
 */

import { syncOrderEventToN8n, type OrderSyncPayload } from '@/lib/integrations/n8n'
import type { Order } from '@/lib/supabase'

/**
 * order.created 事件監聽器 — 同步至 N8N
 * @param payload - { order: Order, metadata: {...} }
 */
export async function handleOrderCreatedN8n(
  payload: Record<string, unknown>
): Promise<void> {
  const order = payload.order as Order | undefined

  if (!order) {
    console.warn('[N8nHandler] order.created event missing order payload')
    return
  }

  try {
    const orderIdentifier = order.order_id || order.id

    // 轉換 Order → OrderSyncPayload
    const syncPayload: OrderSyncPayload = {
      order_id: orderIdentifier,
      status: order.status,
      customer_name: order.customer_name || '',
      phone: order.phone || '',
      pickup_time: order.pickup_time || '',
      total_price: order.total_price || 0,
      final_price: order.final_price,
      promo_code: order.promo_code || null,
      discount_amount: order.discount_amount,
      items: order.items || [],
      source: ((payload.metadata as Record<string, unknown>) || {}).source as string || 'shop',
      updated_at: new Date().toISOString(),
    }

    await syncOrderEventToN8n('order.created', syncPayload)
    console.log(`[N8nHandler] Order ${orderIdentifier} synced to N8N`)
  } catch (error) {
    console.error('[N8nHandler] Failed to sync order to N8N', order.order_id || order.id, error)
    // 不 throw：N8N 同步是 fire-and-forget，dead-letter 由 n8n.ts 處理
  }
}
