import { runOrderAutomation } from '@/src/services/marketing/automation.service'

/**
 * order.created 事件監聽器 → 行銷自動化（order 觸發規則）
 * payload = { order: Order }；非阻斷、失敗不影響訂單流程。
 */
export async function handleOrderCreatedAutomation(
  payload: Record<string, unknown>
): Promise<void> {
  const order = payload.order as
    | { email?: string | null; customer_name?: string; order_id?: string }
    | undefined
  const email = order?.email
  if (!email) return
  try {
    await runOrderAutomation(email, {
      customer_name: order?.customer_name ?? '',
      order_id: order?.order_id ?? '',
    })
  } catch (error) {
    console.error('[automation] order.created 處理失敗（不影響訂單）:', error)
  }
}
