import { createAdminClient } from '@/lib/supabase-admin'
import type { Order, OrderItem, PromoCodeValidation } from '@/lib/supabase'
import { validatePromoCode } from '@/lib/supabase'
import { insertOrder } from '@/src/repositories/order.repository'
import { EventBus } from '@/src/lib/event-bus'

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

interface PromoCodeUsageReservation {
  id: string
  previousUsedCount: number
}

interface PromoCodeUsageRow {
  id: string
  used_count: number | null
  max_uses: number | null
  is_active: boolean | null
  valid_from: string | null
  valid_until: string | null
}

function parsePrice(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (raw === null || raw === undefined) return 0
  const cleaned = String(raw).replace(/[^0-9.]/g, '')
  const value = cleaned === '' ? NaN : Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

function calculateDeliveryFee(
  deliveryMethod: string | undefined,
  subtotal: number
): number {
  if (deliveryMethod !== 'delivery') return 0
  return subtotal >= 2000 ? 0 : 150
}

async function recalculateOrderPricing(items: OrderItem[]) {
  const adminClient = createAdminClient()

  const { data: menuItems, error: menuItemsError } = await adminClient
    .from('menu_items')
    .select('id, name, is_available')

  if (menuItemsError) throw menuItemsError

  const { data: menuVariants, error: menuVariantsError } = await adminClient
    .from('menu_variants')
    .select('id, menu_item_id, variant_name, price')

  if (menuVariantsError) throw menuVariantsError

  const canonicalItems = items.map((item) => {
    const matchedVariant = (menuVariants as MenuVariantRow[]).find((variant) => {
      const compositeId = item.id || ''
      const exactCompositeMatch =
        compositeId.startsWith(`${variant.menu_item_id}-`) &&
        compositeId.endsWith(variant.id)

      const fallbackMatch =
        variant.variant_name === (item.variant_name ?? '標準') &&
        (menuItems as MenuItemRow[]).some(
          (menuItem) =>
            menuItem.id === variant.menu_item_id &&
            menuItem.name === item.name
        )

      return exactCompositeMatch || fallbackMatch
    })

    if (!matchedVariant) {
      throw new OrderValidationError(`商品「${item.name}」規格資料已變動，請重新加入購物車`)
    }

    const matchedMenuItem = (menuItems as MenuItemRow[]).find(
      (menuItem) => menuItem.id === matchedVariant.menu_item_id
    )

    if (!matchedMenuItem || matchedMenuItem.is_available === false) {
      throw new OrderValidationError(`商品「${item.name}」目前不可訂購，請重新整理菜單`)
    }

    return {
      ...item,
      name: matchedMenuItem.name,
      variant_name: matchedVariant.variant_name ?? item.variant_name ?? '標準',
      price: parsePrice(matchedVariant.price),
    }
  })

  const subtotal = canonicalItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return { canonicalItems, subtotal }
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

  return { id: promoCodeRow.id, previousUsedCount }
}

async function rollbackPromoCodeUsage(
  reservation: PromoCodeUsageReservation
): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('promo_codes')
    .update({ used_count: reservation.previousUsedCount })
    .eq('id', reservation.id)

  if (error) {
    console.error('優惠碼使用次數回滾失敗:', error)
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
  // 手機格式驗證
  const phoneRegex = /^[0-9]{8,12}$/
  if (!phoneRegex.test(input.phone.replace(/[\s-]/g, ''))) {
    throw new OrderValidationError('手機號碼格式不正確')
  }

  const { canonicalItems, subtotal } = await recalculateOrderPricing(input.items)

  const deliveryFee = calculateDeliveryFee(input.delivery_method, subtotal)

  let promoCode: string | null = null
  let discountAmount = 0
  let finalPrice = subtotal + deliveryFee
  let promoUsageReservation: PromoCodeUsageReservation | null = null

  if (input.promo_code) {
    const promoValidation = await validatePromoCode(input.promo_code, subtotal)
    if (!promoValidation.valid) {
      throw new OrderValidationError(promoValidation.message)
    }
    promoCode = input.promo_code.toUpperCase().trim()
    discountAmount = promoValidation.discount_amount
    finalPrice = promoValidation.final_amount + deliveryFee
    promoUsageReservation = await reservePromoCodeUsage(promoCode)
  }

  const originalPrice = subtotal

  const orderId = `ORD${Date.now()}`

  const orderData = {
    order_id: orderId,
    customer_name: input.customer_name,
    phone: input.phone,
    email: input.email ?? null,
    pickup_time: input.pickup_time,
    items: canonicalItems,
    total_price: finalPrice,
    original_price: originalPrice,
    final_price: finalPrice,
    discount_amount: discountAmount,
    promo_code: promoCode,
    payment_date: input.payment_date ?? null,
    delivery_method: input.delivery_method ?? 'pickup',
    delivery_address: input.delivery_address ?? null,
    delivery_fee: deliveryFee,
    delivery_notes: input.delivery_notes ?? null,
    mbti_type: input.mbti_type ?? null,
    from_mbti_test: !!input.from_mbti_test,
    source_from: input.source_from ?? 'shop',
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    utm_content: input.utm_content ?? null,
    utm_term: input.utm_term ?? null,
    user_id: input.user_id ?? authUserId,
    status: 'pending',
  } as const

  try {
    await insertOrder(orderData)
  } catch (error) {
    if (promoUsageReservation) {
      await rollbackPromoCodeUsage(promoUsageReservation)
    }
    throw error
  }

  console.log(`成功建立訂單: ${orderId}`)

  // Phase 2: emit("order.created") event bus
  // 所有後續副作用（加點、通知、integration）都由 event handlers 處理
  // 此處改為 fire-and-forget emit，不阻塞回應
  EventBus.emit('order.created', {
    order: orderData,
    metadata: {
      createdAt: new Date().toISOString(),
      source: 'shop',
    },
  }).catch((error) => {
    console.error('事件發送錯誤（不影響訂單）:', error)
  })

  return { orderId, finalPrice }
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
  return validatePromoCode(code, subtotal)
}

/**
 * 查詢用戶的歷史訂單列表
 * @param userId - Supabase auth user ID
 * @returns Order 陣列
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 取消訂單（檢查狀態是否允許取消後再更新）
 * @param orderId - 訂單 ID
 * @param requesterId - 發起取消的 user ID（權限驗證用）
 */
export async function cancelOrder(
  orderId: string,
  requesterId: string
): Promise<void> {
  // TODO: implement
  throw new Error('Not implemented')
}
