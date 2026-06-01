import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import { fetchCampaign } from '@/src/repositories/marketing.repository'
import { runCampaign } from '@/src/services/marketing/campaign.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/campaigns/[id]/send-test  { testEmail }
 * 只寄給指定測試信箱（不碰真顧客名單、不寫 campaign idempotency）。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { testEmail } = await req.json()
    if (!testEmail || typeof testEmail !== 'string') {
      return NextResponse.json({ error: '需要測試 email' }, { status: 400 })
    }
    const campaign = await fetchCampaign(id)
    if (!campaign) {
      return NextResponse.json({ error: '找不到活動' }, { status: 404 })
    }
    const result = await runCampaign(campaign, { testEmail })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('API 錯誤 - 活動測試寄送:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
