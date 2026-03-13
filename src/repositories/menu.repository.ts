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
  updated_at: string
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
  updated_at: string
}

export interface UpdateMenuItemPayload {
  category_id?: string | null
  image?: string | null
  prices?: unknown[]
  is_available?: boolean
  updated_at: string
  [key: string]: unknown
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
