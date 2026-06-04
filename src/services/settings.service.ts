import { fetchBusinessSettings } from '@/src/repositories/settings.repository'

/**
 * 業務設定服務層
 * 將 business_settings（key-value JSONB）讀成型別化、含預設值的物件。
 * 預設值沿用既有 env 變數以向後相容；DB 有值則覆蓋預設。
 * 每個 getter 可接受已取得的 settings map，避免同一請求重複查 DB。
 */

export type SettingsMap = Record<string, unknown>

export interface StoreInfo {
  name: string
  phone: string
  line_id: string
  email: string
  address: string
}

export interface PaymentMethods {
  bank_transfer: boolean
  line_pay: boolean
}

export type LinePayStatus = 'hidden' | 'internal_test' | 'public'

export interface PaymentSettings {
  bank_name: string
  bank_code: string
  bank_branch: string
  bank_account: string
  account_holder: string
  line_pay_status: LinePayStatus
  methods: PaymentMethods
}

export interface DeliverySettings {
  pickup_available: boolean
  delivery_available: boolean
  delivery_fee: number
  free_delivery_threshold: number
  delivery_areas: string[]
}

export interface OrderRules {
  minimum_order_amount: number
  order_notes_enabled: boolean
  require_phone: boolean
}

export interface NotificationSettings {
  order_created: { discord: boolean }
  order_status: { discord: boolean; email: boolean }
  pickup_reminder: { discord: boolean }
}

export interface BusinessHours {
  weekday_hours: string
  weekend_hours: string
  closed_days: number[]
  special_closures: string[]
}

// ── 型別守衛 + 取值（避免 any / as 強轉）────────────────────────────
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr)
const isNumArr = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNum)

const str = (v: unknown, d: string): string => (isStr(v) ? v : d)
const num = (v: unknown, d: number): number => (isNum(v) ? v : d)
const bool = (v: unknown, d: boolean): boolean => (isBool(v) ? v : d)
const LINE_PAY_STATUSES: readonly LinePayStatus[] = ['hidden', 'internal_test', 'public']

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function asObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

async function resolveMap(pre?: SettingsMap): Promise<SettingsMap> {
  if (pre) return pre
  try {
    return await fetchBusinessSettings()
  } catch {
    return {}
  }
}

export function isLinePayStatus(value: unknown): value is LinePayStatus {
  return isStr(value) && LINE_PAY_STATUSES.includes(value as LinePayStatus)
}

function getDefaultLinePayStatus(): LinePayStatus {
  const raw = process.env.LINEPAY_PUBLIC_STATUS || process.env.LINE_PAY_PUBLIC_STATUS
  return isLinePayStatus(raw) ? raw : 'hidden'
}

export function hasLinePayCredentials(): boolean {
  return !!process.env.LINEPAY_CHANNEL_ID && !!process.env.LINEPAY_CHANNEL_SECRET
}

export function canUseLinePay(settings: PaymentSettings, isAdmin: boolean): boolean {
  if (!hasLinePayCredentials() || !settings.methods.line_pay) return false
  if (settings.line_pay_status === 'public') return true
  return settings.line_pay_status === 'internal_test' && isAdmin
}

// ── Getters ────────────────────────────────────────────────────────
export async function getStoreInfo(pre?: SettingsMap): Promise<StoreInfo> {
  const raw = asObject((await resolveMap(pre)).store_info)
  return {
    name: str(raw.name, process.env.STORE_NAME || 'MoonMoon Dessert'),
    phone: str(raw.phone, process.env.STORE_PHONE || ''),
    line_id: str(raw.line_id, process.env.STORE_LINE_ID || ''),
    email: str(raw.email, process.env.RESEND_FROM_EMAIL || ''),
    address: str(raw.address, ''),
  }
}

export async function getPaymentSettings(pre?: SettingsMap): Promise<PaymentSettings> {
  const raw = asObject((await resolveMap(pre)).payment_settings)
  const methods = asObject(raw.methods)
  const linePayStatus = isLinePayStatus(raw.line_pay_status)
    ? raw.line_pay_status
    : getDefaultLinePayStatus()
  return {
    // 預設值鏡像 lib/notifications.ts 既有的 live fallback，確保 P3 接線後行為不變
    bank_name: str(raw.bank_name, process.env.BANK_NAME || '連線銀行'),
    bank_code: str(raw.bank_code, process.env.BANK_CODE || '824'),
    bank_branch: str(raw.bank_branch, process.env.BANK_BRANCH || ''),
    bank_account: str(raw.bank_account, process.env.BANK_ACCOUNT || '111007479473'),
    account_holder: str(raw.account_holder, process.env.ACCOUNT_HOLDER || ''),
    line_pay_status: linePayStatus,
    methods: {
      bank_transfer: bool(methods.bank_transfer, true),
      line_pay: bool(methods.line_pay, hasLinePayCredentials()),
    },
  }
}

export async function getDeliverySettings(pre?: SettingsMap): Promise<DeliverySettings> {
  const raw = asObject((await resolveMap(pre)).delivery_settings)
  return {
    pickup_available: bool(raw.pickup_available, true),
    delivery_available: bool(raw.delivery_available, true),
    // 預設鏡像結帳頁既有寫死值（運費 150 / 滿 2000 免運），避免接線後金額改變
    delivery_fee: num(raw.delivery_fee, 150),
    free_delivery_threshold: num(raw.free_delivery_threshold, 2000),
    delivery_areas: isStrArr(raw.delivery_areas) ? raw.delivery_areas : ['台南市'],
  }
}

export async function getOrderRules(pre?: SettingsMap): Promise<OrderRules> {
  const raw = asObject((await resolveMap(pre)).order_rules)
  return {
    minimum_order_amount: num(raw.minimum_order_amount, 0),
    order_notes_enabled: bool(raw.order_notes_enabled, true),
    require_phone: bool(raw.require_phone, true),
  }
}

export async function getNotificationSettings(pre?: SettingsMap): Promise<NotificationSettings> {
  const raw = asObject((await resolveMap(pre)).notification_settings)
  const created = asObject(raw.order_created)
  const status = asObject(raw.order_status)
  const pickup = asObject(raw.pickup_reminder)
  return {
    order_created: { discord: bool(created.discord, true) },
    order_status: { discord: bool(status.discord, true), email: bool(status.email, true) },
    pickup_reminder: { discord: bool(pickup.discord, true) },
  }
}

export async function getBusinessHours(pre?: SettingsMap): Promise<BusinessHours> {
  const raw = asObject((await resolveMap(pre)).business_hours)
  return {
    weekday_hours: str(raw.weekday_hours, '10:00-18:00'),
    weekend_hours: str(raw.weekend_hours, '10:00-18:00'),
    closed_days: isNumArr(raw.closed_days) ? raw.closed_days : [0],
    special_closures: isStrArr(raw.special_closures) ? raw.special_closures : [],
  }
}
