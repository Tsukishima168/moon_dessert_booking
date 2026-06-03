import { createAdminClient } from '@/lib/supabase-admin'

export interface MenuItemRow {
  id: string
  name: string
  category_id: string | null
  description: string | null
  prices: unknown[]
  image: string | null
  is_available: boolean
  sort_order: number
  line_order_url?: string | null
  mbti_type?: string | null
  [key: string]: unknown
}

export interface InsertMenuItemPayload {
  name: string
  category_id: string | null
  description: string | null
  prices: unknown[]
  image: string | null
  is_available: boolean
  sort_order: number
}

export interface UpdateMenuItemPayload {
  name?: string
  category_id?: string | null
  description?: string | null
  image?: string | null
  prices?: unknown[]
  is_available?: boolean
  sort_order?: number
  line_order_url?: string | null
  mbti_type?: string | null
  [key: string]: unknown
}

export interface MenuVariantRow {
  id: string
  menu_item_id: string
  item_name_ref: string | null
  spec: string | null
  price: string | number | null
  sort_order: number | null
  [key: string]: unknown
}

export interface InsertMenuVariantPayload {
  menu_item_id: string
  item_name_ref: string
  spec: string
  price: string | number
  sort_order: number
}

/**
 * 查詢所有菜單品項，優先依 sort_order，再依名稱排序
 * @returns MenuItemRow 陣列（原始 DB 欄位）
 */
export async function findAllMenuItems(): Promise<MenuItemRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('menu_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name')
  if (error) throw error
  return (data || []) as MenuItemRow[]
}

/**
 * 依 ID 查詢單一菜單品項
 * @param id - 品項 UUID
 * @returns MenuItemRow
 */
export async function findMenuItemById(id: string): Promise<MenuItemRow> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as MenuItemRow
}

/**
 * 查詢所有菜單規格，依品項與排序欄位排序
 * @returns MenuVariantRow 陣列（原始 DB 欄位）
 */
export async function findAllMenuVariants(): Promise<MenuVariantRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('menu_variants')
    .select('*')
    .order('menu_item_id', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data || []) as MenuVariantRow[]
}

/**
 * 查詢指定菜單品項的所有規格
 * @param menuItemId - 菜單品項 UUID
 * @returns MenuVariantRow 陣列
 */
export async function findMenuVariantsByMenuItemId(
  menuItemId: string
): Promise<MenuVariantRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('menu_variants')
    .select('*')
    .eq('menu_item_id', menuItemId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data || []) as MenuVariantRow[]
}

/**
 * 新增菜單品項
 * @param payload - 品項資料
 * @returns 新建的 MenuItemRow
 */
export async function insertMenuItem(
  payload: InsertMenuItemPayload
): Promise<MenuItemRow> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('menu_items')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data as MenuItemRow
}

/**
 * 更新菜單品項
 * @param id - 品項 UUID
 * @param payload - 更新欄位
 * @returns 更新後的 MenuItemRow
 */
export async function updateMenuItem(
  id: string,
  payload: UpdateMenuItemPayload
): Promise<MenuItemRow> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('menu_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as MenuItemRow
}

/**
 * 替換指定菜單品項的所有規格
 * @param menuItemId - 菜單品項 UUID
 * @param payloads - 規格資料
 * @returns 新建的 MenuVariantRow 陣列
 */
export async function replaceMenuVariants(
  menuItemId: string,
  payloads: InsertMenuVariantPayload[]
): Promise<MenuVariantRow[]> {
  const adminClient = createAdminClient()

  const { error: deleteError } = await adminClient
    .from('menu_variants')
    .delete()
    .eq('menu_item_id', menuItemId)
  if (deleteError) throw deleteError

  if (payloads.length === 0) return []

  const { data, error } = await adminClient
    .from('menu_variants')
    .insert(payloads)
    .select()
  if (error) throw error
  return (data || []) as MenuVariantRow[]
}

/**
 * 刪除菜單品項
 * @param id - 品項 UUID
 */
export async function deleteMenuItem(id: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('menu_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}
