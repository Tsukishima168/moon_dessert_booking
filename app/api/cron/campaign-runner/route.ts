import { NextResponse } from 'next/server'
import { runDueCampaigns } from '@/src/services/marketing/campaign.service'

// Vercel Cron：定時跑到期的 email 行銷活動
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  // 比照 pickup-reminder：CRON_SECRET 必填 + Bearer 驗證
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/campaign-runner] CRON_SECRET 未設定，拒絕')
    return NextResponse.json({ success: false, message: '服務未設定' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[cron/campaign-runner] 未授權的請求')
    return NextResponse.json({ success: false, message: '未授權' }, { status: 401 })
  }

  try {
    const result = await runDueCampaigns()
    console.log('[cron/campaign-runner] 完成:', result)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[cron/campaign-runner] 錯誤:', error)
    return NextResponse.json({ success: false, message: '執行失敗' }, { status: 500 })
  }
}
