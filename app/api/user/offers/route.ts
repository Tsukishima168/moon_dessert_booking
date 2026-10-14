import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { listMemberOffers } from '@/src/services/promo-checkout.service'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const { data: { user }, error } = await (await createClient()).auth.getUser()
    if (error || !user) return NextResponse.json({ error: '請先登入會員中心。' }, { status: 401 })
    return NextResponse.json(await listMemberOffers(user.id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: '目前無法載入會員優惠，請稍後再試。' }, { status: 503 })
  }
}
