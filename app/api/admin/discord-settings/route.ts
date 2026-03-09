import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '../_utils/ensureAdmin'
import {
  getDiscordConfigStatus,
  saveDiscordWebhook,
} from '@/src/services/discord.service'

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// GET - 取得 Discord 設定狀態
export async function GET() {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    return NextResponse.json(getDiscordConfigStatus())
  } catch (error) {
    console.error('Discord 設定錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// POST - 驗證並儲存 Discord Webhook URL
export async function POST(req: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const { webhookUrl } = await req.json()
    await saveDiscordWebhook(webhookUrl)
    return NextResponse.json({
      success: true,
      message: '✅ Discord Webhook 已驗證並儲存',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '伺服器錯誤'
    const status = message.includes('無效') || message.includes('無法連接') ? 400 : 500
    console.error('Discord 設定保存錯誤:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
