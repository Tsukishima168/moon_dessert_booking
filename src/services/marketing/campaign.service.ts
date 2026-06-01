import {
  fetchDueEmailCampaigns,
  fetchTemplate,
  markCampaignSent,
  getCustomerEmails,
  filterConsented,
  ensureUnsubscribeToken,
  alreadySent,
  logSend,
  type Campaign,
} from '@/src/repositories/marketing.repository'
import { renderTemplate, sendViaChannel } from './dispatcher'

/**
 * 行銷活動引擎（Service 層）
 * - 收件人一律先過「已同意」(filterConsented)；test 模式只寄給指定測試信箱。
 * - idempotency：同 campaign 對同 email 只寄一次（alreadySent）。
 * - 內容：優先 template_id（push_templates），否則用 campaign 標題/描述。
 */

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
  const { subject, body } = await resolveContent(c)

  const recipients = opts?.testEmail
    ? [opts.testEmail]
    : await filterConsented(await getCustomerEmails())

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const email of recipients) {
    if (!opts?.testEmail && (await alreadySent(c.id, email))) {
      skipped++
      continue
    }
    const token = (await ensureUnsubscribeToken(email)) ?? ''
    const result = await sendViaChannel('email', email, { subject, html: body }, { unsubscribeToken: token })
    await logSend({
      campaign_id: opts?.testEmail ? null : c.id,
      email,
      channel: 'email',
      status: result.ok ? 'sent' : 'failed',
      error: result.reason ?? null,
    })
    if (result.ok) sent++
    else failed++
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
