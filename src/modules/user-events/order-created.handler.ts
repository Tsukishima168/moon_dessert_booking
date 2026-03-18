/**
 * order-created.handler.ts
 * EventBus 'order.created' → 寫入 user_events
 * Phase 2：跨站行為追蹤
 */
import { createAdminClient } from '@/lib/supabase/admin'

interface OrderCreatedPayload {
  order: {
    order_id: string
    user_id: string | null
    total_price: number
    items: unknown[]
    mbti_type: string | null
    from_mbti_test: boolean
  }
}

export async function handleOrderCreatedUserEvent(
  payload: OrderCreatedPayload
): Promise<void> {
  const { order } = payload
  if (!order.user_id) return  // 訪客訂單，無 user_id，略過

  try {
    const admin = createAdminClient()
    const { error } = await admin.rpc('insert_user_event_for_user', {
      p_user_id: order.user_id,
      p_event_type: 'order_placed',
      p_site: 'shop',
      p_metadata: {
        order_id: order.order_id,
        total_price: order.total_price,
        item_count: Array.isArray(order.items) ? order.items.length : 0,
        mbti_type: order.mbti_type,
        from_mbti_test: order.from_mbti_test,
      },
    })

    if (error) throw error
  } catch (err) {
    // fire-and-forget：失敗只 log，不影響訂單流程
    console.error('[user-events] order_placed insert failed:', err)
  }
}
