/**
 * kw_attr — 五站共用的第一接觸歸因 cookie 契約（UPGRADE_SPEC.md R4）。
 *
 * 純函式 + 一個薄薄的 cookie I/O 層，讓 shop 既能「寫」（自己也是一個可能的
 * 落地站）也能「讀」（結帳時把歸因帶進 orders 表）。邏輯只實作 shop 需要的
 * 子集（UTM 首次觸點 + from 最近站內入口），不處理 mbti 的寫入 — 那是
 * kiwimu.com 測驗完成時的責任，這裡只負責「讀到就照樣往後帶」。
 *
 * 任何一步失敗（cookie 壞掉、格式不符、window/document 不存在）一律回傳
 * 空物件或略過寫入，絕不丟出例外 — 歸因資料遺失是可接受的，擋住頁面載入或
 * 建單不可接受。
 */

export const KW_ATTR_COOKIE_NAME = 'kw_attr'
export const KW_ATTR_COOKIE_DOMAIN = '.kiwimu.com'
export const KW_ATTR_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 天

const FIRST_TOUCH_STALE_MS = 30 * 24 * 60 * 60 * 1000 // 30 天：首次觸點過期後才可被覆寫
const MAX_FIELD_LENGTH = 64
const MAX_LANDING_LENGTH = 255

/** mbti 驗證：四碼 EI/NS/TF/JP，可選 -A / -T 後綴（例：INTJ-A） */
export const MBTI_PATTERN = /^[EI][NS][TF][JP](-[AT])?$/

export interface KwAttrCookie {
  src?: string
  med?: string
  cmp?: string
  cnt?: string
  trm?: string
  land?: string
  ts?: number
  mbti?: string
  mbti_ts?: number
  from?: string
  from_ts?: number
}

export function isKiwimuHost(hostname: string | undefined | null): boolean {
  if (!hostname) return false
  return hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com')
}

/**
 * 字串欄位清理：型別檢查、去除控制字元、trim、截斷到上限長度。
 * 用在前端寫 cookie 前的第一道防線，也直接匯出給後端建單驗證重用同一套規則。
 */
export function clampAttributionField(
  value: unknown,
  maxLength: number = MAX_FIELD_LENGTH
): string | undefined {
  if (typeof value !== 'string') return undefined
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\x00-\x1F\x7F]/g, '').trim()
  if (!cleaned) return undefined
  return cleaned.slice(0, maxLength)
}

/** from 的格式（R4 v1.1）：只小寫英數與底線；長度上限沿用 clampAttributionField。 */
export const FROM_PATTERN = /^[a-z0-9_]+$/

/** 格式不符（大寫、空白、符號…）一律當作沒有這個值，安靜丟棄，不丟出例外。 */
export function clampFromField(value: unknown): string | undefined {
  const candidate = clampAttributionField(value)
  if (!candidate || !FROM_PATTERN.test(candidate)) return undefined
  return candidate
}

/**
 * GA4 `entry_from`：cookie 來源的 from 只在 from_ts 距今 < 30 分鐘時才當作這次著陸的入口。
 * 實際判斷寫在 lib/ga-hosts.ts 的 <head> bootstrap script（要在 hydrate 前、同步排入 gtag
 * config，無法 import 本檔），該處引用這裡的常數與 FROM_PATTERN 以免漂移。
 */
export const ENTRY_FROM_WINDOW_MS = 30 * 60 * 1000

function clampTimestamp(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** 安全解析 kw_attr cookie 的值（已經過 encodeURIComponent 的字串）。壞掉一律回傳 {}。 */
export function parseKwAttrCookie(rawValue: string | null | undefined): KwAttrCookie {
  if (!rawValue) return {}
  try {
    const decoded = decodeURIComponent(rawValue)
    const parsed = JSON.parse(decoded) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const obj = parsed as Record<string, unknown>
    return {
      src: clampAttributionField(obj.src),
      med: clampAttributionField(obj.med),
      cmp: clampAttributionField(obj.cmp),
      cnt: clampAttributionField(obj.cnt),
      trm: clampAttributionField(obj.trm),
      land: clampAttributionField(obj.land, MAX_LANDING_LENGTH),
      ts: clampTimestamp(obj.ts),
      mbti: clampAttributionField(obj.mbti, 8),
      mbti_ts: clampTimestamp(obj.mbti_ts),
      from: clampFromField(obj.from),
      from_ts: clampTimestamp(obj.from_ts),
    }
  } catch {
    return {}
  }
}

export function serializeKwAttrCookie(value: KwAttrCookie): string {
  return encodeURIComponent(JSON.stringify(value))
}

export interface ComputeAttributionWriteInput {
  search: string
  existing: KwAttrCookie
  now: number
  landingHostname?: string
}

export interface ComputeAttributionWriteResult {
  next: KwAttrCookie
  changed: boolean
}

/**
 * 純函式：依 R4 寫入規則計算下一版 cookie 值。
 * - URL 有 utm_source 且沒有 from → 首次觸點；cookie 內尚無 src，或 ts 已超過
 *   30 天才寫入（不覆蓋既有的第一次歸因）。
 * - URL 有 from → 一律覆寫 from / from_ts（最近一次站內入口，跟「首次」無關）。
 * 兩者互斥於同一次 query（R4 定義本就以「有沒有 from」分流），但程式上分開判斷，
 * 允許同一次讀取裡兩者都成立時各自套用規則。
 */
export function computeAttributionWrite({
  search,
  existing,
  now,
  landingHostname,
}: ComputeAttributionWriteInput): ComputeAttributionWriteResult {
  const params = new URLSearchParams(search)
  const from = clampFromField(params.get('from') ?? undefined)
  const utmSource = clampAttributionField(params.get('utm_source') ?? undefined)

  const next: KwAttrCookie = { ...existing }
  let changed = false

  if (utmSource && !from) {
    const isStale = !existing.ts || now - existing.ts > FIRST_TOUCH_STALE_MS
    if (!existing.src || isStale) {
      next.src = utmSource
      next.med = clampAttributionField(params.get('utm_medium') ?? undefined)
      next.cmp = clampAttributionField(params.get('utm_campaign') ?? undefined)
      next.cnt = clampAttributionField(params.get('utm_content') ?? undefined)
      next.trm = clampAttributionField(params.get('utm_term') ?? undefined)
      next.land = clampAttributionField(landingHostname, MAX_LANDING_LENGTH)
      next.ts = now
      changed = true
    }
  }

  if (from) {
    next.from = from
    next.from_ts = now
    changed = true
  }

  return { next, changed }
}

function readRawCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? match[1] : null
}

/** 讀 kw_attr cookie（client-only）。cookie 不存在或壞掉一律回傳 {}，絕不丟出例外。 */
export function readKwAttrCookie(): KwAttrCookie {
  try {
    return parseKwAttrCookie(readRawCookie(KW_ATTR_COOKIE_NAME))
  } catch {
    return {}
  }
}

type WindowWithInitialSearch = Window & { __SHOP_INITIAL_SEARCH__?: string }

/**
 * 依目前頁面網址寫入／更新 kw_attr cookie（client-only）。
 * 只在 hostname 結尾為 kiwimu.com 時動作；root layout 的 head script 會在
 * hydrate 前就把 tracking 參數從網址上拔掉並存進 window.__SHOP_INITIAL_SEARCH__，
 * 所以這裡要讀那個快照，不能直接讀 window.location.search（那時已經被拔掉了）。
 */
export function writeKwAttrCookieFromLocation(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  try {
    const hostname = window.location.hostname
    if (!isKiwimuHost(hostname)) return

    const win = window as WindowWithInitialSearch
    const search = win.__SHOP_INITIAL_SEARCH__ || window.location.search
    if (!search) return

    const existing = readKwAttrCookie()
    const { next, changed } = computeAttributionWrite({
      search,
      existing,
      now: Date.now(),
      landingHostname: hostname,
    })

    if (!changed) return

    const parts = [
      `${KW_ATTR_COOKIE_NAME}=${serializeKwAttrCookie(next)}`,
      `domain=${KW_ATTR_COOKIE_DOMAIN}`,
      'path=/',
      `max-age=${KW_ATTR_MAX_AGE_SECONDS}`,
      'SameSite=Lax',
    ]
    if (window.location.protocol === 'https:') {
      parts.push('Secure')
    }
    document.cookie = parts.join('; ')
  } catch {
    // 歸因 cookie 絕不能影響頁面載入，任何錯誤都吞掉。
  }
}

export interface SanitizedOrderAttribution {
  mbti_type: string | null
  from_mbti_test: boolean
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
}

/**
 * 後端側驗證（R4：「後端做長度上限（64 字）與格式驗證；cookie 壞掉或缺值時
 * 一律當作沒有，不能讓建單失敗」）。輸入直接來自前端送來的 body，不可信任，
 * 一律經過長度上限 + 型別檢查；mbti_type 另外驗證格式，格式不符當作沒有。
 * from_mbti_test 不信任前端傳來的布林值，一律由伺服器根據驗證後的 mbti_type 推導。
 */
export function sanitizeOrderAttribution(input: {
  mbti_type?: unknown
  utm_source?: unknown
  utm_medium?: unknown
  utm_campaign?: unknown
  utm_content?: unknown
  utm_term?: unknown
}): SanitizedOrderAttribution {
  const mbtiCandidate = clampAttributionField(input.mbti_type, 8)
  const mbti_type = mbtiCandidate && MBTI_PATTERN.test(mbtiCandidate) ? mbtiCandidate : null

  return {
    mbti_type,
    from_mbti_test: Boolean(mbti_type),
    utm_source: clampAttributionField(input.utm_source) ?? null,
    utm_medium: clampAttributionField(input.utm_medium) ?? null,
    utm_campaign: clampAttributionField(input.utm_campaign) ?? null,
    utm_content: clampAttributionField(input.utm_content) ?? null,
    utm_term: clampAttributionField(input.utm_term) ?? null,
  }
}
