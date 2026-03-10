import { resend } from '@/lib/resend';

/**
 * 訂單狀態變更 Email 通知 handler
 *
 * 觸發條件（依 EVENTS.md order.status_changed）：
 *   - pending → ready：通知客戶可取貨
 *   - 任何 → cancelled：通知客戶訂單已取消
 *
 * 無 email 或 RESEND_API_KEY 時靜默略過（不 throw，讓 EventBus 記錄 warn）
 */

type StatusChangedPayload = {
  order_id: string;
  customer_name: string;
  email: string | null;
  old_status: string;
  new_status: string;
  pickup_time?: string;
  total_price?: number;
};

const STORE_NAME = process.env.STORE_NAME ?? 'MoonMoon Dessert';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

export async function handleOrderStatusChanged(
  payload: Record<string, unknown>
): Promise<void> {
  const { order_id, customer_name, email, new_status, pickup_time, total_price } =
    payload as StatusChangedPayload;

  if (!email) return;

  const isReady = new_status === 'ready';
  const isCancelled = new_status === 'cancelled';
  if (!isReady && !isCancelled) return;

  let subject: string;
  let html: string;

  if (isReady) {
    subject = `【${STORE_NAME}】您的訂單已可取貨 🎉`;
    html = `
      <div style="font-family:sans-serif; max-width:500px; margin:0 auto;">
        <h2 style="color:#d4a574;">您的訂單已準備好了！</h2>
        <p>親愛的 ${customer_name}，</p>
        <p>您的訂單 <b>${order_id}</b> 現在已可取貨。</p>
        ${pickup_time ? `<p>預約時間：<b>${pickup_time}</b></p>` : ''}
        ${total_price ? `<p>訂單金額：<b>$${total_price}</b></p>` : ''}
        <p>期待在店裡見到您！🍰</p>
        <p style="color:#888; font-size:12px;">— ${STORE_NAME} 團隊</p>
      </div>
    `;
  } else {
    subject = `【${STORE_NAME}】您的訂單已取消`;
    html = `
      <div style="font-family:sans-serif; max-width:500px; margin:0 auto;">
        <h2>訂單取消通知</h2>
        <p>親愛的 ${customer_name}，</p>
        <p>您的訂單 <b>${order_id}</b> 已被取消。</p>
        <p>如有任何問題，歡迎透過 LINE 或電話與我們聯繫。</p>
        <p style="color:#888; font-size:12px;">— ${STORE_NAME} 團隊</p>
      </div>
    `;
  }

  if (!resend) {
    console.warn('[EmailHandler] RESEND_API_KEY 未設定，略過 email');
    return;
  }

  const { error } = await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });

  if (error) {
    throw new Error(`[EmailHandler] 發送失敗 (${order_id}): ${error.message}`);
  }

  console.info(`[EmailHandler] ${new_status} email 已發送 → ${email}`);
}
