import { createAdminClient } from '@/lib/supabase-admin'

/**
 * 行銷引擎 Repository（純 DB）
 * 同意 / 寄送紀錄 / 範本 的存取。寄送邏輯在 dispatcher，本檔不做商業邏輯。
 */

export interface PushTemplate {
  id: string
  name: string
  channel: string
  template_type: string
  title: string | null
  message: string
  image_url: string | null
  action_url: string | null
  variables: string[]
  is_active: boolean
}

export interface MarketingSendRecord {
  campaign_id?: string | null
  rule_id?: string | null
  email: string
  channel: string
  status: string
  error?: string | null
}

const CAMPAIGN_SEND_CLAIM_STALE_MS = 15 * 60 * 1000

// ── 同意 / 退訂 ──────────────────────────────────────────────
export async function isConsented(email: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('marketing_consents')
    .select('consent')
    .eq('email', email)
    .maybeSingle()
  return data?.consent === true
}

/** 僅回傳「已同意」的 email（寄送前過濾的唯一入口）*/
export async function filterConsented(emails: string[]): Promise<string[]> {
  const unique = Array.from(new Set(emails.filter(Boolean)))
  if (unique.length === 0) return []
  const db = createAdminClient()
  const { data } = await db
    .from('marketing_consents')
    .select('email')
    .eq('consent', true)
    .in('email', unique)
  const ok = new Set((data ?? []).map((r) => r.email as string))
  return unique.filter((e) => ok.has(e))
}

export async function setConsent(
  email: string,
  consent: boolean,
  source: string
): Promise<void> {
  const db = createAdminClient()
  await db.from('marketing_consents').upsert(
    { email, consent, source, updated_at: new Date().toISOString() },
    { onConflict: 'email' }
  )
}

/** 退訂：依 token 設 consent=false，回傳是否命中 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('marketing_consents')
    .update({ consent: false, updated_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .select('email')
    .maybeSingle()
  return !!data
}

/** 取得（必要時建立）某 email 的退訂 token，供寄送時組退訂連結 */
export async function ensureUnsubscribeToken(email: string): Promise<string | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('marketing_consents')
    .select('unsubscribe_token')
    .eq('email', email)
    .maybeSingle()
  return data?.unsubscribe_token ?? null
}

// ── 寄送紀錄（idempotency + 稽核）────────────────────────────
export async function alreadySent(campaignId: string, email: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('marketing_sends')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('email', email)
    .maybeSingle()
  return !!data
}

function isUniqueConflict(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

export async function claimCampaignSend(campaignId: string, email: string): Promise<boolean> {
  const db = createAdminClient()
  const { error } = await db.from('marketing_sends').insert({
    campaign_id: campaignId,
    rule_id: null,
    email,
    channel: 'email',
    status: 'sending',
    error: null,
    sent_at: new Date().toISOString(),
  })

  if (!error) return true
  if (isUniqueConflict(error)) return reclaimStaleCampaignSend(campaignId, email)
  throw error
}

async function reclaimStaleCampaignSend(
  campaignId: string,
  email: string
): Promise<boolean> {
  const db = createAdminClient()
  const staleBefore = new Date(Date.now() - CAMPAIGN_SEND_CLAIM_STALE_MS).toISOString()
  const { data, error } = await db
    .from('marketing_sends')
    .update({
      status: 'sending',
      error: null,
      sent_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
    .eq('email', email)
    .eq('status', 'sending')
    .lt('sent_at', staleBefore)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return !!data
}

export async function completeCampaignSend(
  campaignId: string,
  email: string,
  status: string,
  errorMessage?: string | null
): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('marketing_sends')
    .update({
      status,
      error: errorMessage ?? null,
      sent_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
    .eq('email', email)

  if (error) throw error
}

export async function logSend(rec: MarketingSendRecord): Promise<void> {
  const db = createAdminClient()
  const row = {
    campaign_id: rec.campaign_id ?? null,
    rule_id: rec.rule_id ?? null,
    email: rec.email,
    channel: rec.channel,
    status: rec.status,
    error: rec.error ?? null,
    sent_at: new Date().toISOString(),
  }
  const { error } = await db.from('marketing_sends').insert(row)

  if (!error) return
  if (!isUniqueConflict(error)) throw error
  if (!rec.campaign_id) return

  await completeCampaignSend(rec.campaign_id, rec.email, rec.status, rec.error)
}

// ── 範本 ─────────────────────────────────────────────────────
export async function fetchTemplate(id: string): Promise<PushTemplate | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('push_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as PushTemplate | null) ?? null
}

// ── 活動（campaigns）─────────────────────────────────────────
export interface Campaign {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  target_audience: string | null
  scheduled_at: string | null
  template_id: string | null
  sent_count: number | null
}

/** 撈「已排程、type=email、已到期」的活動 */
export async function fetchDueEmailCampaigns(): Promise<Campaign[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .eq('type', 'email')
    .lte('scheduled_at', new Date().toISOString())
  return (data as Campaign[] | null) ?? []
}

export async function fetchCampaign(id: string): Promise<Campaign | null> {
  const db = createAdminClient()
  const { data } = await db.from('campaigns').select('*').eq('id', id).maybeSingle()
  return (data as Campaign | null) ?? null
}

export async function markCampaignSent(id: string, sentCount: number): Promise<void> {
  const db = createAdminClient()
  await db
    .from('campaigns')
    .update({ status: 'completed', sent_at: new Date().toISOString(), sent_count: sentCount })
    .eq('id', id)
}

/** 所有曾下單顧客的 email（去重）。分眾 target_audience 之後再擴充 */
export async function getCustomerEmails(): Promise<string[]> {
  const db = createAdminClient()
  const { data } = await db.from('orders').select('email').not('email', 'is', null)
  return Array.from(new Set((data ?? []).map((r) => r.email as string).filter(Boolean)))
}

// ── 自動化規則（marketing_automation_rules）──────────────────
export interface MarketingRule {
  id: string
  title: string
  trigger_type: string
  delay_minutes: number
  channels: string[]
  is_active: boolean
  template_id: string | null
}

export async function fetchActiveRules(trigger: string): Promise<MarketingRule[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('marketing_automation_rules')
    .select('*')
    .eq('trigger_type', trigger)
    .eq('is_active', true)
  return (data as MarketingRule[] | null) ?? []
}
