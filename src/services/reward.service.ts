import type { Order } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'

export interface RewardGrant {
  userId: string
  points: number
  reason: string
  orderId: string
}

/**
 * 訂單建立後發放點數獎勵（由 order.created 事件觸發，勿直接呼叫）
 * @param order - 已建立的訂單物件
 *
 * 點數計算規則：
 * - 確認付款訂單：每 100 元 = 1 點
 * - 最低 10 點
 */
export async function grantOrderReward(order: Order): Promise<void> {
  if (!order.user_id || !order.id) {
    console.warn('grantOrderReward: order missing user_id or id, skipping reward');
    return;
  }

  const pointsEarned = Math.max(10, Math.floor((order.final_price || order.total_price || 0) / 100));
  const reason = `order_reward_${order.id}`;
  const metadata = { orderId: order.id, finalPrice: order.final_price || order.total_price };

  const client = createAdminClient();

  try {
    const { data, error } = await client.rpc('manage_user_points', {
      p_user_id: order.user_id,
      p_amount: pointsEarned,
      p_reason: reason,
      p_metadata: metadata,
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      console.error(`grantOrderReward failed for order ${order.id}:`, result.error);
    }
  } catch (error) {
    console.error(`grantOrderReward RPC error for order ${order.id}:`, error);
    // 不 throw，因為點數發放失敗不應影響訂單建立流程（fire-and-forget）
  }
}

/**
 * 查詢用戶目前的點數餘額
 * @param userId - Supabase auth user ID
 * @returns 點數數字，查詢失敗時回傳 0
 */
export async function getUserPoints(userId: string): Promise<number> {
  const client = createAdminClient();

  try {
    const { data, error } = await client
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (error?.code === 'PGRST116') return 0; // No rows found
    if (error) throw error;

    return (data?.points as number) || 0;
  } catch (error) {
    console.error(`getUserPoints error for ${userId}:`, error);
    return 0;
  }
}

/**
 * 扣除點數（兌換折抵時使用）
 * @param userId - Supabase auth user ID
 * @param points - 要扣除的點數
 * @param orderId - 關聯訂單 ID（audit log 用）
 *
 * @throws Error 若點數不足或 RPC 執行失敗
 */
export async function deductPoints(
  userId: string,
  points: number,
  orderId: string
): Promise<void> {
  const client = createAdminClient();
  const reason = `redemption_order_${orderId}`;
  const metadata = { orderId, redeemedAt: new Date().toISOString() };

  try {
    const { data, error } = await client.rpc('manage_user_points', {
      p_user_id: userId,
      p_amount: -points, // 負數表示扣除
      p_reason: reason,
      p_metadata: metadata,
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      throw new Error(result.error || 'Failed to deduct points');
    }
  } catch (error) {
    console.error(`deductPoints error for user ${userId}:`, error);
    throw new Error(`Failed to deduct points: ${error instanceof Error ? error.message : String(error)}`);
  }
}
