import {
  findAllMenuItems,
  findAllMenuVariants,
  findMenuItemById,
  findMenuVariantsByMenuItemId,
  insertMenuItem,
  updateMenuItem,
  deleteMenuItem,
  replaceMenuVariants,
  type MenuItemRow,
  type MenuVariantRow,
  type UpdateMenuItemPayload,
  type MenuItemContentFields,
} from '@/src/repositories/menu.repository'

export interface MenuVariantPublic {
  id: string
  menu_item_id: string
  variant_name: string
  price: number
  sort_order: number
}

export interface MenuItemPublic extends MenuItemRow {
  category: string
  image_url: string
  is_active: boolean
  variants: MenuVariantPublic[]
  price: number
  recommended: boolean
  created_at: string
  updated_at: string
}

export interface CreateMenuItemInput extends MenuItemContentFields {
  name: string
  category?: string
  category_id?: string
  description?: string
  price?: number
  prices?: unknown[]
  variants?: unknown[]
  image?: string
  image_url?: string
  is_active?: boolean
  is_available?: boolean
  sort_order?: number
}

export interface UpdateMenuItemInput extends MenuItemContentFields {
  id: string
  name?: string
  category?: string
  category_id?: string
  description?: string
  price?: number
  image?: string
  image_url?: string
  prices?: unknown[]
  variants?: unknown[]
  is_available?: boolean
  is_active?: boolean
  sort_order?: number
  line_order_url?: string | null
  mbti_type?: string | null
  updated_at?: string
  [key: string]: unknown
}

// 電商內容欄位清單（P0-2）：create/update 共用，逐一 pass-through
const CONTENT_FIELD_KEYS: Array<keyof MenuItemContentFields> = [
  'tagline',
  'size_info',
  'ingredients',
  'allergens',
  'storage_info',
  'delivery_type',
  'lead_time_days',
  'gallery_urls',
  'included_items',
  'available_from',
  'available_until',
  'slug',
]

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * gallery_urls 只准 https。前端表單也擋，但驗證不能只在 client：
 * 帶 admin session 直接打 API 就能塞 javascript:/data:/內網 URL。
 */
function assertValidGalleryUrls(urls: unknown): void {
  if (urls === undefined || urls === null) return
  if (!Array.isArray(urls)) {
    throw new Error('gallery_urls 必須是陣列')
  }
  const invalid = urls.filter((url) => typeof url !== 'string' || !isHttpsUrl(url))
  if (invalid.length > 0) {
    throw new Error(`圖片網址必須是 https://：${invalid.join(', ')}`)
  }
}

function pickContentFields(
  input: MenuItemContentFields
): MenuItemContentFields {
  assertValidGalleryUrls(input.gallery_urls)

  const result: MenuItemContentFields = {}
  for (const key of CONTENT_FIELD_KEYS) {
    if (input[key] !== undefined) {
      ;(result as Record<string, unknown>)[key] = input[key]
    }
  }
  return result
}

interface NormalizedVariantInput {
  spec: string
  price: number
  sort_order: number
}

function parsePrice(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (raw === null || raw === undefined) return 0

  const cleaned = String(raw).replace(/[^0-9.]/g, '')
  const value = cleaned === '' ? NaN : Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

function getObjectValue(source: unknown, key: string): unknown {
  if (!source || typeof source !== 'object') return undefined
  return (source as Record<string, unknown>)[key]
}

function normalizeVariantInputs(input: {
  price?: unknown
  prices?: unknown[]
  variants?: unknown[]
}): NormalizedVariantInput[] {
  const source = Array.isArray(input.variants)
    ? input.variants
    : Array.isArray(input.prices)
      ? input.prices
      : []

  const variants = source.map((variant, index) => {
    const spec =
      String(
        getObjectValue(variant, 'variant_name') ??
          getObjectValue(variant, 'spec') ??
          getObjectValue(variant, 'name') ??
          '一般'
      ).trim() || '一般'
    const price = parsePrice(getObjectValue(variant, 'price'))
    const sortOrder = Number(getObjectValue(variant, 'sort_order'))

    return {
      spec,
      price,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : index,
    }
  })

  if (variants.length > 0) return variants
  if (input.price !== undefined) {
    return [{ spec: '一般', price: parsePrice(input.price), sort_order: 0 }]
  }
  return []
}

function hasVariantUpdate(input: {
  price?: unknown
  prices?: unknown[]
  variants?: unknown[]
}): boolean {
  return (
    input.price !== undefined ||
    input.prices !== undefined ||
    input.variants !== undefined
  )
}

function toPriceList(variants: NormalizedVariantInput[]) {
  return variants.map((variant) => ({
    spec: variant.spec,
    price: variant.price,
  }))
}

function toVariantPayloads(
  menuItemId: string,
  itemName: string,
  variants: NormalizedVariantInput[]
) {
  return variants.map((variant) => ({
    menu_item_id: menuItemId,
    item_name_ref: itemName,
    spec: variant.spec,
    price: variant.price,
    sort_order: variant.sort_order,
  }))
}

function variantsFromPriceList(
  item: MenuItemRow,
  prices: unknown
): MenuVariantPublic[] {
  if (!Array.isArray(prices)) return []

  return prices.map((priceEntry, index) => ({
    id: `${item.id}-price-${index}`,
    menu_item_id: item.id,
    variant_name:
      String(
        getObjectValue(priceEntry, 'variant_name') ??
          getObjectValue(priceEntry, 'spec') ??
          getObjectValue(priceEntry, 'name') ??
          '一般'
      ).trim() || '一般',
    price: parsePrice(getObjectValue(priceEntry, 'price')),
    sort_order: index,
  }))
}

function serializeMenuItem(
  item: MenuItemRow,
  variants: MenuVariantRow[] = []
): MenuItemPublic {
  const publicVariants = variants.map((variant, index) => ({
    id: String(variant.id),
    menu_item_id: String(variant.menu_item_id),
    variant_name:
      String(
        (variant.variant_name as string | undefined) ??
          variant.spec ??
          '一般'
      ).trim() || '一般',
    price: parsePrice(variant.price),
    sort_order: variant.sort_order ?? index,
  }))

  const normalizedVariants =
    publicVariants.length > 0
      ? publicVariants
      : variantsFromPriceList(item, item.prices)
  const lowestPrice =
    normalizedVariants.length > 0
      ? Math.min(...normalizedVariants.map((variant) => variant.price))
      : 0

  return {
    ...item,
    category: String((item.category as string | undefined) ?? item.category_id ?? ''),
    image_url: String((item.image_url as string | undefined) ?? item.image ?? ''),
    is_available: item.is_available !== false,
    is_active: item.is_available !== false,
    variants: normalizedVariants,
    prices: toPriceList(
      normalizedVariants.map((variant) => ({
        spec: variant.variant_name,
        price: variant.price,
        sort_order: variant.sort_order,
      }))
    ),
    price: lowestPrice,
    recommended: Boolean(item.recommended),
    created_at: String((item.created_at as string | undefined) ?? ''),
    updated_at: String((item.updated_at as string | undefined) ?? ''),
  }
}

/**
 * 取得所有菜單品項，並對齊前台所需的欄位名稱（category / image_url）
 * @returns MenuItemPublic 陣列
 */
export async function listMenuItems(): Promise<MenuItemPublic[]> {
  const [items, variants] = await Promise.all([
    findAllMenuItems(),
    findAllMenuVariants(),
  ])
  const variantsByItemId = new Map<string, MenuVariantRow[]>()

  variants.forEach((variant) => {
    const existing = variantsByItemId.get(variant.menu_item_id) ?? []
    existing.push(variant)
    variantsByItemId.set(variant.menu_item_id, existing)
  })

  return items.map((item) => serializeMenuItem(
    item,
    variantsByItemId.get(item.id) ?? []
  ))
}

/**
 * 新增菜單品項（對齊新舊欄位名稱）
 * @param input - 前端傳入資料
 * @returns 新建的 MenuItemRow
 */
export async function createMenuItem(
  input: CreateMenuItemInput
): Promise<MenuItemPublic> {
  const normalizedVariants = normalizeVariantInputs(input)
  const item = await insertMenuItem({
    name: input.name,
    category_id: input.category_id ?? input.category ?? null,
    description: input.description ?? null,
    prices: toPriceList(normalizedVariants),
    image: input.image ?? input.image_url ?? null,
    is_available: input.is_available ?? input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
    ...pickContentFields(input),
  })

  try {
    const variants = await replaceMenuVariants(
      item.id,
      toVariantPayloads(item.id, item.name, normalizedVariants)
    )
    return serializeMenuItem(item, variants)
  } catch (error) {
    await deleteMenuItem(item.id).catch((cleanupError) => {
      console.error('createMenuItem cleanup error:', cleanupError)
    })
    throw error
  }
}

/**
 * 更新菜單品項（正規化新舊欄位名稱差異）
 * @param input - 含 id 的更新資料
 * @returns 更新後的 MenuItemRow
 */
export async function editMenuItem(
  input: UpdateMenuItemInput
): Promise<MenuItemPublic> {
  const payload: UpdateMenuItemPayload = {}
  const normalizedVariants = hasVariantUpdate(input)
    ? normalizeVariantInputs(input)
    : null

  if (input.name !== undefined) payload.name = input.name
  if (input.category_id !== undefined || input.category !== undefined) {
    payload.category_id = input.category_id ?? input.category ?? null
  }
  if (input.description !== undefined) payload.description = input.description ?? null
  if (input.image !== undefined || input.image_url !== undefined) {
    payload.image = input.image ?? input.image_url ?? null
  }
  if (input.is_available !== undefined || input.is_active !== undefined) {
    payload.is_available = input.is_available ?? input.is_active ?? true
  }
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order
  if (input.line_order_url !== undefined) {
    payload.line_order_url = input.line_order_url ?? null
  }
  if (input.mbti_type !== undefined) payload.mbti_type = input.mbti_type ?? null
  if (normalizedVariants) payload.prices = toPriceList(normalizedVariants)
  Object.assign(payload, pickContentFields(input))

  const item = Object.keys(payload).length > 0
    ? await updateMenuItem(input.id, payload)
    : await findMenuItemById(input.id)

  const variants = normalizedVariants
    ? await replaceMenuVariants(
        item.id,
        toVariantPayloads(item.id, item.name, normalizedVariants)
      )
    : await findMenuVariantsByMenuItemId(item.id)

  return serializeMenuItem(item, variants)
}

/**
 * 刪除菜單品項
 * @param id - 品項 UUID
 */
export async function removeMenuItem(id: string): Promise<void> {
  return deleteMenuItem(id)
}
