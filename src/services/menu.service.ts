import {
  findAllMenuItems,
  insertMenuItem,
  updateMenuItem,
  deleteMenuItem,
  type MenuItemRow,
} from '@/src/repositories/menu.repository'

export interface MenuItemPublic extends MenuItemRow {
  category: string
  image_url: string
}

export interface CreateMenuItemInput {
  name: string
  category?: string
  category_id?: string
  description?: string
  prices?: unknown[]
  variants?: unknown[]
  image?: string
  image_url?: string
  is_available?: boolean
  sort_order?: number
}

export interface UpdateMenuItemInput {
  id: string
  category?: string
  category_id?: string
  image?: string
  image_url?: string
  prices?: unknown[]
  variants?: unknown[]
  is_available?: boolean
  is_active?: boolean
  updated_at?: string
  [key: string]: unknown
}

/**
 * 取得所有菜單品項，並對齊前台所需的欄位名稱（category / image_url）
 * @returns MenuItemPublic 陣列
 */
export async function listMenuItems(): Promise<MenuItemPublic[]> {
  const items = await findAllMenuItems()
  return items.map((item) => ({
    ...item,
    category: (item.category as string) || String(item.category_id ?? ''),
    image_url: (item.image_url as string) || (item.image as string) || '',
  }))
}

/**
 * 新增菜單品項（對齊新舊欄位名稱）
 * @param input - 前端傳入資料
 * @returns 新建的 MenuItemRow
 */
export async function createMenuItem(
  input: CreateMenuItemInput
): Promise<MenuItemRow> {
  return insertMenuItem({
    name: input.name,
    category_id: input.category_id ?? input.category ?? null,
    description: input.description ?? null,
    prices: input.prices ?? input.variants ?? [],
    image: input.image ?? input.image_url ?? null,
    is_available: input.is_available !== false,
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  })
}

/**
 * 更新菜單品項（正規化新舊欄位名稱差異）
 * @param input - 含 id 的更新資料
 * @returns 更新後的 MenuItemRow
 */
export async function editMenuItem(
  input: UpdateMenuItemInput
): Promise<MenuItemRow> {
  const { id, category, image_url, variants, is_active, ...rest } = input

  const payload = {
    ...rest,
    category_id: input.category_id ?? category,
    image: input.image ?? image_url,
    prices: input.prices ?? variants ?? [],
    is_available:
      input.is_available !== undefined ? input.is_available : is_active,
    updated_at: new Date().toISOString(),
  }

  // 移除 undefined 值避免覆蓋現有資料
  Object.keys(payload).forEach((key) => {
    if (payload[key as keyof typeof payload] === undefined) {
      delete payload[key as keyof typeof payload]
    }
  })

  return updateMenuItem(id, payload)
}

/**
 * 刪除菜單品項
 * @param id - 品項 UUID
 */
export async function removeMenuItem(id: string): Promise<void> {
  return deleteMenuItem(id)
}
