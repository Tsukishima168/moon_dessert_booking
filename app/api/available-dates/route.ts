import { NextRequest, NextResponse } from 'next/server'
import { getAvailableDateRange } from '@/src/services/product.service'

export const dynamic = 'force-dynamic'

// GET /api/available-dates?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&delivery_method=pickup
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const deliveryMethod = (searchParams.get('delivery_method') ?? 'pickup') as 'pickup' | 'delivery'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: '缺少必要參數：start_date, end_date' },
        { status: 400 }
      )
    }

    const data = await getAvailableDateRange(startDate, endDate, deliveryMethod)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API 錯誤 - 取得可預訂日期:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '取得可預訂日期失敗',
        data: [],
      },
      { status: 500 }
    )
  }
}
