import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '../_utils/ensureAdmin'
import {
  listMenuItems,
  createMenuItem,
  editMenuItem,
  removeMenuItem,
} from '@/src/services/menu.service'

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const errorMsg = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const isInvalidCategoryError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === '23503' &&
  String((error as { message?: unknown }).message ?? '').includes('menu_items_category_id_fkey')

const menuWriteError = (error: unknown, fallback: string) => {
  if (isInvalidCategoryError(error)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}

// GET - 取得所有菜單品項
export async function GET() {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const items = await listMenuItems()
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET /api/admin/menu error:', error)
    return NextResponse.json(
      { error: errorMsg(error, 'Failed to fetch menu items') },
      { status: 500 }
    )
  }
}

// POST - 建立新菜單品項
export async function POST(req: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const body = await req.json()
    const hasCategory = Boolean(body.category || body.category_id)
    const hasPrice =
      body.price !== undefined ||
      Array.isArray(body.variants) ||
      Array.isArray(body.prices)
    if (!body.name || !hasCategory || !hasPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const data = await createMenuItem(body)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (isInvalidCategoryError(error)) {
      return menuWriteError(error, 'Failed to create menu item')
    }
    console.error('POST /api/admin/menu error:', error)
    return menuWriteError(error, 'Failed to create menu item')
  }
}

// PUT - 更新菜單品項
export async function PUT(req: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    const data = await editMenuItem(body)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (isInvalidCategoryError(error)) {
      return menuWriteError(error, 'Failed to update menu item')
    }
    console.error('PUT /api/admin/menu error:', error)
    return menuWriteError(error, 'Failed to update menu item')
  }
}

// DELETE - 刪除菜單品項
export async function DELETE(req: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    await removeMenuItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/menu error:', error)
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 })
  }
}
