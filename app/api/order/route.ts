import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createOrder, OrderValidationError } from '@/src/services/order.service'

// POST /api/order - 建立新訂單
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 必填欄位守衛
    const { customer_name, phone, pickup_time, items, total_price } = body
    if (!customer_name || !phone || !pickup_time || !items || total_price === undefined || total_price === null) {
      return NextResponse.json(
        { success: false, message: '缺少必要欄位' },
        { status: 400 }
      )
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: '購物車是空的' },
        { status: 400 }
      )
    }

    // 取得登入用戶（允許未登入）
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { orderId } = await createOrder(body, user?.id ?? null)

    return NextResponse.json({
      success: true,
      order_id: orderId,
      message: '訂單建立成功！我們已收到您的預訂。',
    })
  } catch (error) {
    console.error('API 錯誤 - 建立訂單:', error)
    const message =
      error instanceof Error ? error.message : '建立訂單失敗，請稍後再試'
    const status = error instanceof OrderValidationError ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
