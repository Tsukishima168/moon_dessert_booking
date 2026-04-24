import { NextRequest, NextResponse } from 'next/server'
import { getAvailableCapacity } from '@/src/services/product.service'

export const dynamic = 'force-dynamic'

// GET /api/check-capacity?date=YYYY-MM-DD&delivery_method=pickup
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const rawMethod = searchParams.get('delivery_method')
    const deliveryMethod: 'pickup' | 'delivery' =
      rawMethod === 'delivery' ? 'delivery' : 'pickup'

    if (!date) {
      return NextResponse.json({ error: '缺少日期參數' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: '日期格式錯誤，請使用 YYYY-MM-DD' }, { status: 400 })
    }

    const capacity = await getAvailableCapacity(date, deliveryMethod)
    return NextResponse.json(capacity)
  } catch (error) {
    console.error('API 錯誤 - 檢查產能:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
