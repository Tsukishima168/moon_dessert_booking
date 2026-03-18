import { NextRequest, NextResponse } from 'next/server'
import { getMenuItemAvailability } from '@/src/services/product.service'

export const dynamic = 'force-dynamic'

// GET /api/check-menu-availability?date=YYYY-MM-DD&menu_item_id=uuid
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const date = searchParams.get('date')
    const menuItemId = searchParams.get('menu_item_id')

    if (!date) {
      return NextResponse.json(
        { error: 'date parameter is required' },
        { status: 400 }
      )
    }

    const data = await getMenuItemAvailability(date, menuItemId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('菜單項目可用性檢查錯誤:', error)
    // 系統錯誤仍回傳可用，避免阻擋用戶
    return NextResponse.json({ available: true, reason: '系統錯誤，預設可用' })
  }
}
