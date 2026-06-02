import {
  fetchDueEmailCampaigns,
  fetchTemplate,
  markCampaignSent,
  getCustomerEmails,
  filterConsented,
  ensureUnsubscribeToken,
  claimCampaignSend,
  completeCampaignSend,
  logSend,
  type Campaign,
} from '@/src/repositories/marketing.repository'
import { renderTemplate, sendViaChannel } from './dispatcher'

/**
 * 行銷活動引擎（Service 層）
 * - 收件人一律先過「已同意」(filterConsented)；test 模式只寄給指定測試信箱。
 * - idempotency：同 campaign 對同 email 先 claim 再寄送，避免並發重複寄送。
 * - 內容：優先 template_id（push_templates），否則用 campaign 標題/描述。
 */

function isSupportedTargetAudience(targetAudience: string | null): boolean {
  const normalized = targetAudience?.trim().toLowerCase()
  return !normalized || normalized === 'all'
}

async function resolveContent(c: Campaign): Promise<{ subject: string; body: string }> {
  if (c.template_id) {
    const tpl = await fetchTemplate(c.template_id)
    if (tpl) {
      const r = renderTemplate({ title: tpl.title, message: tpl.message })
      return { subject: r.subject, body: r.html }
    }
  }
  return { subject: c.title, body: c.description ?? '' }
}

export interface CampaignRunResult {
  sent: number
  skipped: number
  failed: number
}

export async function runCampaign(
  c: Campaign,
  opts?: { testEmail?: string }
): Promise<CampaignRunResult> {
  if (!opts?.testEmail && !isSupportedTargetAudience(c.target_audience)) {
    console.warn(
      `[marketing/campaign] Campaign ${c.id} has unsupported target_audience="${c.target_audience}". Skipping send.`
    )
    return { sent: 0, skipped: 0, failed: 0 }
  }

  const { subject, body } = await resolveContent(c)

  const recipients = opts?.testEmail
    ? [opts.testEmail]
    : await filterConsented(await getCustomerEmails())

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const email of recipients) {
    if (!opts?.testEmail) {
      const claimed = await claimCampaignSend(c.id, email)
      if (!claimed) {
        skipped++
        continue
      }
    }

    try {
      const token = (await ensureUnsubscribeToken(email)) ?? ''
      const result = await sendViaChannel('email', email, { subject, html: body }, { unsubscribeToken: token })
      if (!opts?.testEmail) {
        await completeCampaignSend(c.id, email, result.ok ? 'sent' : 'failed', result.reason ?? null)
      } else {
        await logSend({
          campaign_id: null,
          email,
          channel: 'email',
          status: result.ok ? 'sent' : 'failed',
          error: result.reason ?? null,
        })
      }
      if (result.ok) sent++
      else failed++
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (!opts?.testEmail) {
        await completeCampaignSend(c.id, email, 'failed', reason)
      } else {
        await logSend({
          campaign_id: null,
          email,
          channel: 'email',
          status: 'failed',
          error: reason,
        })
      }
      failed++
    }
  }

  if (!opts?.testEmail) await markCampaignSent(c.id, sent)
  return { sent, skipped, failed }
}

/** Cron 入口：跑所有到期的 email 活動 */
export async function runDueCampaigns(): Promise<{ campaigns: number; sent: number }> {
  const due = await fetchDueEmailCampaigns()
  let totalSent = 0
  for (const c of due) {
    const r = await runCampaign(c)
    totalSent += r.sent
  }
  return { campaigns: due.length, sent: totalSent }
}
