import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '../_utils/ensureAdmin'
import { findOrders } from '@/src/repositories/order.repository'

// GET /api/admin/orders?status=pending&limit=100
export async function GET(request: NextRequest) {
  const isAdmin = await ensureAdmin()
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') ?? undefined
    const limit = parseInt(searchParams.get('limit') ?? '100')
    const data = await findOrders(status, limit)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('取得訂單列表錯誤:', error)
    return NextResponse.json({ success: false, message: '取得訂單失敗' }, { status: 500 })
  }
}
