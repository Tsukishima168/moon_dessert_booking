import {
  fetchActiveRules,
  fetchTemplate,
  isConsented,
  ensureUnsubscribeToken,
  logSend,
  type MarketingRule,
} from '@/src/repositories/marketing.repository'
import { renderTemplate, sendViaChannel } from './dispatcher'

/**
 * 行銷自動化引擎（Service 層）
 * order 觸發：下單後依 active rules 寄行銷信。
 * 護欄：僅 email 通道、僅「已同意」者、delay_minutes=0 立即（>0 之延遲佇列尚未實作，log 略過）。
 * birthday / inactive 觸發需額外 schema/資料（生日、最後下單日門檻），待擴充。
 */
async function resolveRuleContent(
  rule: MarketingRule
): Promise<{ subject: string; body: string } | null> {
  if (!rule.template_id) return null
  const tpl = await fetchTemplate(rule.template_id)
  if (!tpl) return null
  return { subject: tpl.title ?? rule.title, body: tpl.message }
}

export async function runOrderAutomation(
  email: string,
  vars: Record<string, string>
): Promise<void> {
  if (!email) return
  const rules = await fetchActiveRules('order')
  if (rules.length === 0) return
  // 僅寄給已同意行銷者（與 campaigns 一致）
  if (!(await isConsented(email))) return

  const token = (await ensureUnsubscribeToken(email)) ?? ''
  for (const rule of rules) {
    if (!rule.channels.includes('email')) continue // 目前僅接 email 通道
    if (rule.delay_minutes > 0) {
      console.log(`[automation] rule ${rule.id} delay=${rule.delay_minutes}min；延遲佇列尚未實作，略過`)
      continue
    }
    const content = await resolveRuleContent(rule)
    if (!content) continue
    const rendered = renderTemplate({ title: content.subject, message: content.body }, vars)
    const result = await sendViaChannel('email', email, rendered, { unsubscribeToken: token })
    await logSend({
      rule_id: rule.id,
      email,
      channel: 'email',
      status: result.ok ? 'sent' : 'failed',
      error: result.reason ?? null,
    })
  }
}
