import { NextRequest, NextResponse } from 'next/server'
import { validateReservation } from '@/src/services/product.service'

export const dynamic = 'force-dynamic'

// GET /api/validate-reservation?date=YYYY-MM-DD&is_rush=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const isRushOrder = searchParams.get('is_rush') === 'true'

    if (!date) {
      return NextResponse.json({ error: '缺少日期參數' }, { status: 400 })
    }

    const result = await validateReservation(date, isRushOrder)
    return NextResponse.json(result)
  } catch (error) {
    console.error('API 錯誤 - 驗證預訂:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
