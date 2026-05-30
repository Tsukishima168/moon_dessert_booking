import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createOrder, OrderValidationError } from '@/src/services/order.service'
import { setConsent } from '@/src/repositories/marketing.repository'

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

    // 驗證每個 item 的結構：name(string), quantity(正整數), price(number/string)
    for (const item of items) {
      if (typeof item !== 'object' || item === null) {
        return NextResponse.json(
          { success: false, message: '商品資料格式錯誤' },
          { status: 400 }
        )
      }
      if (typeof item.name !== 'string' || item.name.trim() === '') {
        return NextResponse.json(
          { success: false, message: '商品名稱缺失或格式錯誤' },
          { status: 400 }
        )
      }
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json(
          { success: false, message: `商品「${item.name}」數量必須為正整數` },
          { status: 400 }
        )
      }
      const p = Number(item.price)
      if (item.price === undefined || item.price === null || !Number.isFinite(p) || p < 0) {
        return NextResponse.json(
          { success: false, message: `商品「${item.name}」價格格式錯誤` },
          { status: 400 }
        )
      }
    }

    // 取得登入用戶（允許未登入）
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { orderId, finalPrice } = await createOrder(body, user?.id ?? null)

    // 行銷 opt-in：結帳勾選「接收優惠資訊」→ 寫入同意（綁真實訂單 email，非阻斷）
    if (body.marketing_consent === true && typeof body.email === 'string' && body.email) {
      try {
        await setConsent(body.email, true, 'checkout')
      } catch (consentError) {
        console.error('寫入行銷同意失敗（不影響訂單）:', consentError)
      }
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      final_price: finalPrice,
      finalPrice,
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
