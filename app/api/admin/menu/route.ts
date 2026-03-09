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
    if (!body.name || !body.category || body.price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const data = await createMenuItem(body)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('POST /api/admin/menu error:', error)
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 })
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
    console.error('PUT /api/admin/menu error:', error)
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 })
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
