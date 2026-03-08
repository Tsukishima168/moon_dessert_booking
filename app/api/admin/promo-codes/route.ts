import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import {
  listPromoCodes,
  createPromoCode,
  editPromoCode,
  removePromoCode,
} from '@/src/services/promo-code.service'

export const dynamic = 'force-dynamic'

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// GET - 取得所有優惠碼
export async function GET() {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const data = await listPromoCodes()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API 錯誤 - 取得優惠碼 (admin):', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST - 新增優惠碼
export async function POST(request: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const body = await request.json()
    if (!body.code || !body.discount_type || body.discount_value === undefined) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }
    const data = await createPromoCode(body)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === '優惠碼已存在') {
      return NextResponse.json({ error: '優惠碼已存在' }, { status: 409 })
    }
    console.error('API 錯誤 - 新增優惠碼:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT - 更新優惠碼
export async function PUT(request: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: '缺少優惠碼 ID' }, { status: 400 })
    }
    const data = await editPromoCode(body)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === '優惠碼已存在') {
      return NextResponse.json({ error: '優惠碼已存在' }, { status: 409 })
    }
    console.error('API 錯誤 - 更新優惠碼:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE - 刪除優惠碼
export async function DELETE(request: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: '缺少優惠碼 ID' }, { status: 400 })
    }
    await removePromoCode(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API 錯誤 - 刪除優惠碼:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
