import { sendEmail } from '@/lib/email/resend'
import type { PushTemplate } from '@/src/repositories/marketing.repository'

/**
 * 行銷寄送 dispatcher（Service 層）
 * email → 真寄（Resend，含退訂頁尾）；line / sms / push → stub（未設定通道，log 跳過）。
 * 之後接 LINE Messaging / 簡訊商 / web-push 時，只在此檔補對應 channel 分支。
 */

export type MarketingChannel = 'email' | 'line' | 'sms' | 'push'

export interface RenderedMessage {
  subject: string
  html: string
}

export interface DispatchResult {
  ok: boolean
  channel: MarketingChannel
  reason?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shop.kiwimu.com'

/** 套用 push_templates 的 {變數}；缺值以空字串取代 */
export function renderTemplate(
  template: Pick<PushTemplate, 'title' | 'message'>,
  vars: Record<string, string> = {}
): RenderedMessage {
  const apply = (s: string) => s.replace(/\{([a-zA-Z_]+)\}/g, (_, k: string) => vars[k] ?? '')
  return {
    subject: apply(template.title ?? '月島甜點'),
    html: apply(template.message ?? ''),
  }
}

function withUnsubscribeFooter(html: string, unsubscribeToken: string): string {
  const url = `${BASE_URL}/api/unsubscribe?token=${unsubscribeToken}`
  return `${html}
    <hr style="margin-top:32px;border:none;border-top:1px solid #ccc"/>
    <p style="font-size:11px;color:#888;text-align:center;line-height:1.6">
      您收到此信是因為您訂閱了月島甜點的優惠資訊。<br/>
      <a href="${url}" style="color:#888;text-decoration:underline">取消訂閱</a>
    </p>`
}

/**
 * 寄送單一訊息到指定通道。
 * email 一定附退訂連結；非 email 通道目前為 stub（回 ok=false, reason=channel_not_configured）。
 */
export async function sendViaChannel(
  channel: MarketingChannel,
  to: string,
  rendered: RenderedMessage,
  opts: { unsubscribeToken: string }
): Promise<DispatchResult> {
  if (channel === 'email') {
    // 真顧客（已同意）一定有 token → 附退訂頁尾；測試信無 token → 不附
    const html = opts.unsubscribeToken
      ? withUnsubscribeFooter(rendered.html, opts.unsubscribeToken)
      : rendered.html
    const ok = await sendEmail(to, rendered.subject, html)
    return { ok, channel, reason: ok ? undefined : 'send_failed' }
  }

  // line / sms / push：尚未設定外部通道憑證，記錄並跳過（不丟錯）
  console.warn(`[marketing/dispatcher] 通道「${channel}」未設定，略過寄送至 ${to}`)
  return { ok: false, channel, reason: 'channel_not_configured' }
}
