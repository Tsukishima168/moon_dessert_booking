import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { applyPromoCode } from '@/src/services/order.service'
import { isSameOriginMutation } from '@/src/lib/request-origin'

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ success: false, message: '請從本站重新操作。' }, { status: 403 })
  try {
    const { code, orderAmount } = await request.json()
    if (typeof code !== 'string' || !code.trim() || code.length > 100 || !Number.isSafeInteger(orderAmount) || orderAmount <= 0) {
      return NextResponse.json({ success: false, message: '請填寫優惠碼並確認商品小計。' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error && error.name !== 'AuthSessionMissingError') throw error
    // Client-supplied user_id/member flags are intentionally ignored.
    const result = await applyPromoCode(code.trim().toUpperCase(), orderAmount, user?.id ?? null)
    return NextResponse.json({ success: result.valid, data: result, message: result.message }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('優惠碼驗證失敗:', error)
    return NextResponse.json({ success: false, message: '優惠服務暫時無法確認，請稍後再試。' }, { status: 503 })
  }
}
