import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'
import type { OrderItem, PromoCodeValidation } from '@/lib/supabase'
import { insertOrder } from '@/src/repositories/order.repository'
import { EventBus } from '@/src/lib/event-bus'
import { after } from 'next/server'
import { isSeasonallyDisabledMenuItemName } from '@/src/lib/seasonal-menu'
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope'
import {
  evaluateMenuItemAvailability,
  isMissingSupabaseRpcError,
  normalizeMenuItemAvailabilityResult,
  type MenuItemAvailabilitySettings,
} from '@/src/lib/menu-availability'
import { getDeliverySettings, getOrderRules, getBusinessHours } from '@/src/services/settings.service'
import { sanitizeOrderAttribution, clampAttributionField } from '@/src/lib/attribution'
import { releasePromoUsage } from '@/src/lib/promo-usage'

export interface CreateOrderInput {
  customer_name: string
  phone: string
  email?: string
  pickup_time: string
  items: OrderItem[]
  total_price: string | number
  promo_code?: string
  discount_amount?: string | number
  original_price?: string | number
  final_price?: string | number
  payment_date?: string
  delivery_method?: string
  delivery_address?: string
  delivery_fee?: string | number
  delivery_notes?: string
  mbti_type?: string
  from_mbti_test?: boolean
  source_from?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  user_id?: string
}

export interface CreateOrderResult {
  orderId: string
  finalPrice: number
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderValidationError'
  }
}

/**
 * insertOrder 已被呼叫之後發生的錯誤：DB 可能已提交訂單、只是回應失敗或後續處理拋錯，
 * 無法確定「訂單沒成立」。route 必須提醒顧客先確認訂單狀態，避免重複下單。
 * 原始錯誤保留在 cause，供 route 的 console.error 追查。
 * （寫入「之前」的失敗用一般 Error / OrderValidationError，代表訂單一定沒成立。）
 */
export class OrderPersistenceUncertainError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'OrderPersistenceUncertainError'
  }
}

interface MenuItemRow {
  id: string
  name: string
  is_available: boolean | null
}

interface MenuVariantRow {
  id: string
  menu_item_id: string
  variant_name: string | null
  price: number | string | null
}

interface CanonicalOrderItem extends OrderItem {
  menu_item_id: string
  variant_id: string
}

interface PromoCodeUsageReservation {
  id: string
}

interface PromoCodeUsageRow {
  id: string
  used_count: number | null
  max_uses: number | null
  is_active: boolean | null
  valid_from: string | null
  valid_until: string | null
  discount_type: 'percentage' | 'fixed' | null
  discount_value: number | null
  min_order_amount: number | null
}

interface ReservationValidationRow {
  valid: boolean
  reason: string | null
}

interface CapacityValidationRow {
  available: boolean
  reason: string | null
}

interface MenuItemAvailabilityResult {
  available: boolean
  reason: string | null
}

function parsePrice(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (raw === null || raw === undefined) return 0
  const cleaned = String(raw).replace(/[^0-9.]/g, '')
  const value = cleaned === '' ? NaN : Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

function getFirstRpcRow<T>(data: unknown): T | null {
  return Array.isArray(data) && data.length > 0 ? (data[0] as T) : null
}

function extractPickupDate(pickupTime: string): string {
  const match = pickupTime.trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s+.+)?$/)
  if (!match) {
    throw new OrderValidationError('取貨日期格式錯誤')
  }

  return match[1]
}

function normalizeDeliveryMethod(
  deliveryMethod: string | undefined
): 'pickup' | 'delivery' {
  if (deliveryMethod === 'delivery') return 'delivery'
  if (deliveryMethod === undefined || deliveryMethod === 'pickup') return 'pickup'
  throw new OrderValidationError('取貨方式不正確')
}

function calculateDeliveryFee(
  deliveryMethod: string | undefined,
  subtotal: number,
  deliveryFee: number,
  freeDeliveryThreshold: number
): number {
  if (deliveryMethod !== 'delivery') return 0
  return freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold ? 0 : deliveryFee
}

async function recalculateOrderPricing(items: OrderItem[]) {
  const adminClient = createAdminClient()

  const { data: menuItems, error: menuItemsError } = await adminClient
    .from('menu_items')
    .select('id, name, is_available')

  if (menuItemsError) {
    console.error('[recalculateOrderPricing] 無法讀取 menu_items，拒絕建立訂單:', menuItemsError.message)
    throw new Error('無法驗證商品價格，請稍後再試')
  }

  const { data: menuVariants, error: menuVariantsError } = await adminClient
    .from('menu_variants')
    // DB 實際欄位是 spec（無 variant_name），用 PostgREST 別名對齊 app 層命名
    .select('id, menu_item_id, variant_name:spec, price')

  if (menuVariantsError) {
    console.error('[recalculateOrderPricing] 無法讀取 menu_variants，拒絕建立訂單:', menuVariantsError.message)
    throw new Error('無法驗證商品價格，請稍後再試')
  }

  const menuItemRows = (menuItems ?? []) as MenuItemRow[]
  const variants = (menuVariants ?? []) as MenuVariantRow[]

  const canonicalItems: CanonicalOrderItem[] = items.map((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OrderValidationError(`商品「${item.name}」數量格式錯誤`)
    }

    if (isSeasonallyDisabledMenuItemName(item.name)) {
      throw new OrderValidationError(`商品「${item.name}」目前已下架，請重新整理菜單`)
    }

    const compositeId = item.id || ''
    const exactVariantMatch = variants.find(
      (variant) =>
        compositeId.startsWith(`${variant.menu_item_id}-`) &&
        compositeId.endsWith(variant.id)
    )
    const fallbackVariantMatch = variants.find((variant) => {
      if (variant.variant_name !== (item.variant_name ?? '標準')) {
        return false
      }

      return menuItemRows.some(
        (menuItem) =>
          menuItem.id === variant.menu_item_id &&
          menuItem.name === item.name
      )
    })
    const matchedVariant = exactVariantMatch ?? fallbackVariantMatch

    if (!matchedVariant) {
      throw new OrderValidationError(`商品「${item.name}」規格已變更，請重新整理菜單後再試`)
    }

    const matchedMenuItem =
      menuItemRows.find((menuItem) => menuItem.id === matchedVariant.menu_item_id) ??
      menuItemRows.find((menuItem) => menuItem.name === item.name)

    if (!matchedMenuItem) {
      throw new OrderValidationError(`找不到商品「${item.name}」，請重新整理菜單後再試`)
    }

    if (matchedMenuItem.is_available === false) {
      throw new OrderValidationError(`商品「${matchedMenuItem.name}」目前不可訂購，請重新整理菜單`)
    }

    const canonicalPrice = parsePrice(matchedVariant.price)
    if (!Number.isFinite(canonicalPrice) || canonicalPrice < 0) {
      throw new Error(`商品「${matchedMenuItem.name}」價格設定異常`)
    }

    return {
      ...item,
      id: `${matchedMenuItem.id}-${matchedVariant.id}`,
      name: matchedMenuItem.name,
      variant_name: matchedVariant.variant_name ?? item.variant_name ?? '標準',
      price: canonicalPrice,
      menu_item_id: matchedMenuItem.id,
      variant_id: matchedVariant.id,
    }
  })

  const subtotal = canonicalItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return { canonicalItems, subtotal }
}

function getWeekdayFromDateString(dateStr: string): number {
  // dateStr 是台灣日期字串（YYYY-MM-DD）。用 UTC 建構避免依伺服器本機時區偏移算錯星期。
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay()
}

/**
 * 公休日擋板：取貨/配送日若落在 business_hours.closed_days（星期，0=Sunday）
 * 或 special_closures（特定日期字串）→ 拒絕訂單。
 * 設定讀不到時 fail-open（不擋，維持原行為），避免因讀取失敗誤擋全部訂單。
 */
async function assertNotClosedDay(pickupDate: string): Promise<void> {
  let businessHours
  try {
    businessHours = await getBusinessHours()
  } catch (error) {
    console.error('[assertNotClosedDay] getBusinessHours 失敗，fail-open 略過公休檢查:', error)
    return
  }

  const weekday = getWeekdayFromDateString(pickupDate)
  const isClosed =
    businessHours.closed_days.includes(weekday) ||
    businessHours.special_closures.includes(pickupDate)

  if (isClosed) {
    throw new OrderValidationError('該日為公休日，請選擇其他取貨日期')
  }
}

async function validateOrderAvailability(
  pickupTime: string,
  normalizedDeliveryMethod: 'pickup' | 'delivery',
  items: CanonicalOrderItem[]
): Promise<'pickup' | 'delivery'> {
  const pickupDate = extractPickupDate(pickupTime)
  await assertNotClosedDay(pickupDate)
  const adminClient = createAdminClient()

  const { data: reservationData, error: reservationError } = await adminClient.rpc(
    'validate_reservation',
    {
      pickup_date: pickupDate,
      is_rush_order: false,
    }
  )

  if (reservationError) {
    console.error('[validateOrderAvailability] validate_reservation error:', reservationError)
    throw new Error('無法驗證預訂日期，請稍後再試')
  }

  const reservation = getFirstRpcRow<ReservationValidationRow>(reservationData)
  if (!reservation?.valid) {
    throw new OrderValidationError(reservation?.reason ?? '此日期目前無法預訂')
  }

  const { data: capacityData, error: capacityError } = await adminClient.rpc(
    'check_daily_capacity',
    {
      check_date: pickupDate,
      delivery_method_param: normalizedDeliveryMethod,
    }
  )

  if (capacityError) {
    console.error('[validateOrderAvailability] check_daily_capacity error:', capacityError)
    throw new Error('無法驗證當日產能，請稍後再試')
  }

  const capacity = getFirstRpcRow<CapacityValidationRow>(capacityData)
  if (!capacity?.available) {
    throw new OrderValidationError(capacity?.reason ?? '當日已無可用名額')
  }

  const currentTime = new Date().toISOString()
  const uniqueMenuItemIds = [...new Set(items.map((item) => item.menu_item_id))]
  for (const menuItemId of uniqueMenuItemIds) {
    const availability = await checkMenuItemAvailabilityForOrder(
      adminClient,
      menuItemId,
      pickupDate,
      currentTime
    )
    if (!availability?.available) {
      throw new OrderValidationError(availability?.reason ?? '商品目前不可訂購')
    }
  }

  return normalizedDeliveryMethod
}

async function checkMenuItemAvailabilityForOrder(
  adminClient: ReturnType<typeof createAdminClient>,
  menuItemId: string,
  pickupDate: string,
  currentTime: string
): Promise<MenuItemAvailabilityResult | null> {
  const { data, error } = await adminClient.rpc(
    'check_menu_item_availability',
    {
      menu_item_id_param: menuItemId,
      delivery_date: pickupDate,
      p_current_time: currentTime,
    }
  )

  if (!error) {
    return normalizeMenuItemAvailabilityResult(data)
  }

  if (!isMissingSupabaseRpcError(error, 'check_menu_item_availability')) {
    console.error('[validateOrderAvailability] check_menu_item_availability error:', error)
    throw new Error('無法驗證商品可用性，請稍後再試')
  }

  const { data: settings, error: settingsError } = await adminClient
    .from('menu_item_availability')
    .select('is_available, available_from, available_until, unavailable_dates, available_weekdays, min_advance_hours')
    .eq('menu_item_id', menuItemId)
    .maybeSingle()

  if (settingsError) {
    console.error('[validateOrderAvailability] menu_item_availability fallback error:', settingsError)
    throw new Error('無法驗證商品可用性，請稍後再試')
  }

  return evaluateMenuItemAvailability(
    settings as MenuItemAvailabilitySettings | null,
    pickupDate,
    new Date(currentTime)
  )
}

/**
 * Server-side 優惠碼驗證（使用 admin client，不依賴瀏覽器 session）
 */
async function validatePromoCodeServer(
  code: string,
  orderAmount: number
): Promise<PromoCodeValidation> {
  const adminClient = createAdminClient()
  const normalizedCode = code.toUpperCase().trim()

  const { data: promoCode, error } = await adminClient
    .from('promo_codes')
    .select('id, discount_type, discount_value, min_order_amount, used_count, max_uses, valid_from, valid_until, is_active')
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .single()

  if (error || !promoCode) {
    return { valid: false, discount_amount: 0, final_amount: orderAmount, message: '找不到此優惠碼' }
  }

  const row = promoCode as PromoCodeUsageRow
  const now = new Date()
  if (row.valid_from && now < new Date(row.valid_from)) {
    return { valid: false, discount_amount: 0, final_amount: orderAmount, message: '此優惠碼尚未生效' }
  }
  if (row.valid_until && now > new Date(row.valid_until)) {
    return { valid: false, discount_amount: 0, final_amount: orderAmount, message: '此優惠碼已過期' }
  }
  const maxUses = row.max_uses === null ? null : Number(row.max_uses)
  const usedCount = Number(row.used_count ?? 0)
  if (maxUses !== null && usedCount >= maxUses) {
    return { valid: false, discount_amount: 0, final_amount: orderAmount, message: '此優惠碼已達使用上限' }
  }
  if (row.min_order_amount && orderAmount < row.min_order_amount) {
    return { valid: false, discount_amount: 0, final_amount: orderAmount, message: `訂單未達最低消費 $${row.min_order_amount}` }
  }

  let discountAmount = 0
  if (row.discount_type === 'percentage') {
    discountAmount = Math.round((orderAmount * (row.discount_value ?? 0)) / 100)
  } else {
    discountAmount = row.discount_value ?? 0
  }
  discountAmount = Math.min(discountAmount, orderAmount)

  return {
    valid: true,
    discount_amount: discountAmount,
    final_amount: orderAmount - discountAmount,
    message: '優惠碼套用成功',
  }
}

async function reservePromoCodeUsage(
  code: string
): Promise<PromoCodeUsageReservation> {
  const adminClient = createAdminClient()
  const normalizedCode = code.toUpperCase().trim()

  const { data: promoCode, error: promoCodeError } = await adminClient
    .from('promo_codes')
    .select('id, used_count, max_uses, is_active, valid_from, valid_until')
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .single()

  if (promoCodeError || !promoCode) {
    throw new OrderValidationError('找不到此優惠碼')
  }

  const promoCodeRow = promoCode as PromoCodeUsageRow
  const previousUsedCount = Number(promoCodeRow.used_count ?? 0)
  const maxUses =
    promoCodeRow.max_uses === null ? null : Number(promoCodeRow.max_uses)

  if (maxUses !== null && previousUsedCount >= maxUses) {
    throw new OrderValidationError('此優惠碼已達使用上限')
  }

  const now = new Date()
  const validFrom = promoCodeRow.valid_from
    ? new Date(promoCodeRow.valid_from)
    : null
  const validUntil = promoCodeRow.valid_until
    ? new Date(promoCodeRow.valid_until)
    : null

  if (validFrom && now < validFrom) {
    throw new OrderValidationError('此優惠碼尚未生效')
  }

  if (validUntil && now > validUntil) {
    throw new OrderValidationError('此優惠碼已過期')
  }

  let updateQuery = adminClient
    .from('promo_codes')
    .update({ used_count: previousUsedCount + 1 })
    .eq('id', promoCodeRow.id)
    .eq('used_count', previousUsedCount)

  if (maxUses !== null) {
    updateQuery = updateQuery.lt('used_count', maxUses)
  }

  const { data: updatedPromoCode, error: updateError } = await updateQuery
    .select('id')
    .maybeSingle()

  if (updateError || !updatedPromoCode) {
    throw new OrderValidationError('此優惠碼已達使用上限，請重新嘗試')
  }

  return { id: promoCodeRow.id }
}

async function rollbackPromoCodeUsage(
  reservation: PromoCodeUsageReservation
): Promise<void> {
  const adminClient = createAdminClient()
  if (!(await releasePromoUsage(adminClient, reservation.id))) {
    console.error('優惠碼使用次數尚未確認釋放，保留額度等待核對')
  }
}

/**
 * 建立新訂單的完整業務流程：
 * 驗證手機格式 → 計算金額 → 生成 order_id → 寫入 DB → 觸發通知（fire-and-forget）
 * @param input - 前端送來的訂單資料（已通過 route 基本驗證）
 * @param authUserId - 從 supabase auth 取得的當前登入用戶 ID（未登入傳 null）
 * @returns 訂單 ID 與最終金額
 */
export async function createOrder(
  input: CreateOrderInput,
  authUserId: string | null
): Promise<CreateOrderResult> {
  if (input.user_id && input.user_id !== authUserId) {
    throw new OrderValidationError('登入資訊無法確認，請重新登入後再試。')
  }

  // 手機格式驗證（接受 +886、09XX 等台灣常見格式）
  const cleanedPhone = input.phone.replace(/[\s\-()+ ]/g, '')
  const phoneRegex = /^[0-9]{8,15}$/
  if (!phoneRegex.test(cleanedPhone)) {
    throw new OrderValidationError('手機號碼格式不正確')
  }

  const { canonicalItems, subtotal } = await recalculateOrderPricing(input.items)
  const [deliverySettings, orderRules] = await Promise.all([
    getDeliverySettings(),
    getOrderRules(),
  ])

  if (orderRules.minimum_order_amount > 0 && subtotal < orderRules.minimum_order_amount) {
    throw new OrderValidationError(
      `本店最低消費金額為 $${orderRules.minimum_order_amount}`
    )
  }

  const normalizedDeliveryMethod = normalizeDeliveryMethod(input.delivery_method)
  if (normalizedDeliveryMethod === 'pickup' && !deliverySettings.pickup_available) {
    throw new OrderValidationError('目前未開放門市自取')
  }
  if (normalizedDeliveryMethod === 'delivery' && !deliverySettings.delivery_available) {
    throw new OrderValidationError('目前未開放宅配')
  }

  await validateOrderAvailability(
    input.pickup_time,
    normalizedDeliveryMethod,
    canonicalItems
  )

  const deliveryFee = calculateDeliveryFee(
    normalizedDeliveryMethod,
    subtotal,
    deliverySettings.delivery_fee,
    deliverySettings.free_delivery_threshold
  )

  let promoCode: string | null = null
  let discountAmount = 0
  let finalPrice = subtotal + deliveryFee
  let promoUsageReservation: PromoCodeUsageReservation | null = null

  if (input.promo_code) {
    const promoValidation = await validatePromoCodeServer(input.promo_code, subtotal)
    if (!promoValidation.valid) {
      throw new OrderValidationError(promoValidation.message)
    }
    promoCode = input.promo_code.toUpperCase().trim()
    discountAmount = promoValidation.discount_amount
    finalPrice = promoValidation.final_amount + deliveryFee
  }

  const originalPrice = subtotal
  const storedItems = canonicalItems.map(({ menu_item_id, variant_id, ...item }) => item)

  const orderId = `ORD-${randomBytes(8).toString('hex').toUpperCase()}`

  // R4：前端送來的歸因欄位不可信任（cookie/localStorage 壞掉、或有人直接打
  // /api/order）。一律經過長度上限（64 字）與格式驗證；mbti_type 格式不符
  // 或缺值一律當作沒有，絕不能讓建單失敗。from_mbti_test 不採信前端傳的布林
  // 值，改由伺服器依驗證後的 mbti_type 推導。
  const attribution = sanitizeOrderAttribution({
    mbti_type: input.mbti_type,
    utm_source: input.utm_source,
    utm_medium: input.utm_medium,
    utm_campaign: input.utm_campaign,
    utm_content: input.utm_content,
    utm_term: input.utm_term,
  })
  const sourceFrom = clampAttributionField(input.source_from) ?? 'shop'

  const orderData = {
    order_id: orderId,
    customer_name: input.customer_name,
    phone: input.phone,
    email: input.email ?? null,
    pickup_time: input.pickup_time,
    items: storedItems,
    total_price: finalPrice,
    original_price: originalPrice,
    final_price: finalPrice,
    discount_amount: discountAmount,
    promo_code: promoCode,
    payment_date: null,
    linepay_transaction_id: null,
    delivery_method: normalizedDeliveryMethod,
    delivery_address: input.delivery_address ?? null,
    delivery_fee: deliveryFee,
    delivery_notes: input.delivery_notes ?? null,
    mbti_type: attribution.mbti_type,
    from_mbti_test: attribution.from_mbti_test,
    checkout_site: SHOP_CHECKOUT_SITE,
    source_from: sourceFrom,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
    user_id: authUserId,
    status: 'pending',
  } as const

  // ── 寫入邊界：從 insertOrder 被呼叫起，任何失敗都不能斷言「訂單沒成立」 ──
  // RPC 可能已提交、只是回應失敗；唯一能確定「沒寫入」的是 P0001（函式內 raise exception，交易已回滾）。
  let createdOrder: Awaited<ReturnType<typeof insertOrder>>
  if (promoCode) promoUsageReservation = await reservePromoCodeUsage(promoCode)
  try {
    createdOrder = await insertOrder(orderData)
  } catch (error) {
    const definitelyRolledBack = !!error && typeof error === 'object' &&
      'code' in error && error.code === 'P0001'
    if (promoUsageReservation && definitelyRolledBack) {
      // 回滾本身不得蓋掉原始錯誤的分類（否則寫入結果不明會被誤報成「尚未成立」）
      try {
        await rollbackPromoCodeUsage(promoUsageReservation)
      } catch (rollbackError) {
        console.error('優惠碼使用次數回滾失敗:', rollbackError)
      }
    }
    if (definitelyRolledBack) {
      throw new OrderValidationError(
        '當日已無可預訂名額，請選擇其他日期。'
      )
    }
    throw new OrderPersistenceUncertainError('訂單寫入結果不明', { cause: error })
  }

  try {
    console.log(`成功建立訂單: ${createdOrder.order_id}`)

    // Phase 2: emit("order.created") event bus
    // 所有後續副作用（加點、通知、integration）都由 event handlers 處理
    // after 由 Next.js 延長請求生命週期，避免回應後 serverless 中止通知。
    // 沒有 after context 的呼叫端改為等待；通知失敗不改變已成立的訂單。
    const dispatch = async () => {
      try {
        await EventBus.emit('order.created', {
          order: createdOrder,
          metadata: {
            createdAt: new Date().toISOString(),
            source: createdOrder.source_from ?? 'shop',
          },
        })
      } catch (error) {
        console.error('事件發送錯誤（不影響訂單）:', error)
      }
    }
    try {
      after(dispatch)
    } catch {
      await dispatch()
    }

    return { orderId: createdOrder.order_id, finalPrice }
  } catch (error) {
    // 寫入已成功，但回傳前拋錯：訂單其實已成立，同樣不能對顧客說「尚未成立」
    throw new OrderPersistenceUncertainError('訂單已寫入但後續處理失敗', { cause: error })
  }
}

/**
 * 驗證優惠碼並計算折扣金額
 * @param code - 優惠碼字串
 * @param subtotal - 訂單小計（未折扣）
 * @returns PromoCodeValidation 物件
 */
export async function applyPromoCode(
  code: string,
  subtotal: number
): Promise<PromoCodeValidation> {
  return validatePromoCodeServer(code, subtotal)
}
