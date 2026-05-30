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

export async function logSend(rec: MarketingSendRecord): Promise<void> {
  const db = createAdminClient()
  await db.from('marketing_sends').insert({
    campaign_id: rec.campaign_id ?? null,
    rule_id: rec.rule_id ?? null,
    email: rec.email,
    channel: rec.channel,
    status: rec.status,
    error: rec.error ?? null,
    sent_at: new Date().toISOString(),
  })
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
