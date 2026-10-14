export class PromotionInputError extends Error {}

export interface PromoConfig {
  code: string
  description: string | null
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
  member_only: boolean
  per_member_limit: number | null
}

const fail = (message: string): never => { throw new PromotionInputError(message) }
export function promoCodeText(value: unknown): string {
  if (typeof value !== 'string') return fail('請填寫優惠代碼。')
  const code = value.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return fail('優惠代碼請使用 3–32 個英文字母、數字、底線或連字號。')
  return code
}
function numberValue(value: unknown, label: string, minimum = 0, maximum = 100000000): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) return fail(`${label}不在可設定範圍內。`)
  return value
}
function optionalLimit(value: unknown, label: string): number | null {
  if (value == null || value === '') return null
  const result = numberValue(value, label, 1, 1000000)
  if (!Number.isSafeInteger(result)) return fail(`${label}請填寫正整數。`)
  return result
}
function textValue(value: unknown, label: string, max: number, required = false): string | null {
  if (value == null || value === '') return required ? fail(`請填寫${label}。`) : null
  if (typeof value !== 'string' || value.trim().length > max) return fail(`${label}最多 ${max} 個字。`)
  const result = value.trim()
  return result || (required ? fail(`請填寫${label}。`) : null)
}
function flag(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') return fail('啟用與會員設定格式不正確。')
  return value
}
function dateValue(value: unknown, label: string): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(Z|[+-]\d\d:\d\d)$/.test(value)) return fail(`${label}請使用含時區的日期時間。`)
  const parts = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/.exec(value)!
  const [, y, m, d, h, minute, sec = '0'] = parts
  const days = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate()
  if (+m < 1 || +m > 12 || +d < 1 || +d > days || +h > 23 || +minute > 59 || +sec > 59) return fail(`${label}不是有效日期。`)
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return fail(`${label}不是有效日期。`)
  return date.toISOString()
}
export function normalizePromoConfig(input: Record<string, unknown>, now = new Date()): PromoConfig {
  const type = input.discount_type
  if (type !== 'fixed' && type !== 'percentage') return fail('請選擇定額折抵或百分比折扣。')
  const value = numberValue(input.discount_value, '折扣數值', 0.01, type === 'percentage' ? 100 : 100000000)
  if (type === 'percentage' && Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) return fail('百分比最多設定小數點後兩位。')
  if (type === 'fixed' && !Number.isSafeInteger(value)) return fail('定額折抵請填寫整數元。')
  const minimum = numberValue(input.min_order_amount ?? 0, '最低消費')
  if (!Number.isSafeInteger(minimum)) return fail('最低消費請填寫整數元。')
  const start = dateValue(input.valid_from, '開始時間') ?? now.toISOString()
  const end = dateValue(input.valid_until, '結束時間')
  if (end && end <= start) return fail('結束時間必須晚於開始時間。')
  const memberOnly = flag(input.member_only, false)
  const memberLimit = optionalLimit(input.per_member_limit, '每人使用上限')
  if (memberLimit && !memberOnly) return fail('設定每人次數前，請先選擇會員限定。')
  return {
    code: promoCodeText(input.code), description: textValue(input.description, '活動說明', 500),
    discount_type: type, discount_value: type === 'percentage' ? Math.round(value * 100) / 100 : value, min_order_amount: minimum,
    max_uses: optionalLimit(input.max_uses, '總使用上限'), valid_from: start, valid_until: end,
    is_active: flag(input.is_active, true), member_only: memberOnly, per_member_limit: memberLimit,
  }
}
export function calculatePromoDiscount(type: 'fixed' | 'percentage', value: number, subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal < 0 || subtotal > 100000000 || !Number.isSafeInteger(subtotal)) return fail('訂單小計格式不正確。')
  if (!['fixed', 'percentage'].includes(type) || !Number.isFinite(value) || value <= 0 || (type === 'percentage' && value > 100) || (type === 'fixed' && !Number.isSafeInteger(value))) return fail('此優惠設定有誤，請聯繫我們確認。')
  const basisPoints = Math.round(value * 100)
  if (type === 'percentage' && Math.abs(value * 100 - basisPoints) > 1e-8) return fail('此優惠的百分比精度不正確。')
  // Integer basis points keep JS and PostgreSQL numeric .5 rounding identical.
  return Math.min(subtotal, type === 'percentage' ? Math.floor((subtotal * basisPoints + 5000) / 10000) : value)
}
export function formatPromoDiscount(type: 'fixed' | 'percentage', value: number): string {
  if (type === 'fixed') return `折抵 NT$ ${value.toLocaleString('zh-TW')}`
  if (value === 100) return '商品金額全額折抵'
  return `${Number(((10000 - Math.round(value * 100)) / 1000).toFixed(3))} 折（減 ${value}%）`
}
export function toTaipeiDateTimeLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (name: string) => parts.find(p => p.type === name)?.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
export function fromTaipeiDateTimeLocal(value: string): string | null {
  if (!value) return null
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return fail('請填寫完整日期與時間。')
  const date = new Date(`${value}:00+08:00`)
  if (!Number.isFinite(date.getTime()) || toTaipeiDateTimeLocal(date.toISOString()) !== value) return fail('日期或時間不正確。')
  return date.toISOString()
}
function safeLink(value: unknown, image = false): string | null {
  const result = textValue(value, image ? '圖片網址' : '連結', 2048)
  if (!result) return null
  if (/[\\\u0000-\u001f\u007f]/.test(result)) return fail('網址不能包含反斜線或控制字元。')
  if (!image && (/^\/(?!\/)/.test(result) || /^#[A-Za-z0-9_-]+$/.test(result))) return result
  try {
    const url = new URL(result)
    if (url.protocol === 'https:' && !url.username && !url.password) return result
  } catch {}
  return fail(image ? '圖片請使用 HTTPS 網址。' : '連結請使用站內路徑或 HTTPS 網址。')
}
export function colorContrast(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
  }
  const a = luminance(first), b = luminance(second)
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}
export function normalizeBannerConfig(input: Record<string, unknown>) {
  const start = dateValue(input.start_date, '開始時間')
  const end = dateValue(input.end_date, '結束時間')
  if (start && end && end <= start) return fail('結束時間必須晚於開始時間。')
  if (!['hero', 'announcement'].includes(String(input.display_type ?? 'hero'))) return fail('請選擇橫幅或公告條。')
  const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value) ? value : value == null ? fallback : fail('顏色請使用六位數色碼。')
  const priority = numberValue(input.priority ?? 0, '顯示順序', 0, 10000)
  if (!Number.isSafeInteger(priority)) return fail('顯示順序請填寫整數。')
  const background = color(input.background_color, '#1f3527'), foreground = color(input.text_color, '#f5f0e8')
  if (colorContrast(background, foreground) < 4.5) return fail('背景與文字太接近，請調整顏色讓公告容易閱讀。')
  return {
    title: textValue(input.title, '標題', 120, true)!, description: textValue(input.description, '簡短說明', 500),
    details: textValue(input.details, '活動詳情', 8000), promo_code: input.promo_code ? promoCodeText(input.promo_code) : null,
    image_url: safeLink(input.image_url, true), link_url: safeLink(input.link_url),
    link_text: textValue(input.link_text, '按鈕文字', 40) ?? '立即查看',
    background_color: background, text_color: foreground,
    is_active: flag(input.is_active, false), priority, display_type: String(input.display_type ?? 'hero'), start_date: start, end_date: end,
  }
}
