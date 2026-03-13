import { NextResponse } from 'next/server'
import { ensureAdmin } from '../../_utils/ensureAdmin'
import { getDiscordConfigStatus } from '@/src/services/discord.service'

function detectN8nMode(webhookUrl: string | undefined) {
  if (!webhookUrl) {
    return {
      isConfigured: false,
      mode: 'not_configured',
      host: null,
      message: 'N8N webhook 未設定',
    }
  }

  try {
    const parsed = new URL(webhookUrl)
    const host = parsed.host

    if (
      host.includes('localhost') ||
      host.startsWith('127.0.0.1') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.')
    ) {
      return {
        isConfigured: true,
        mode: 'local',
        host,
        message: `N8N webhook 已設定（本機 / 內網：${host}）`,
      }
    }

    if (host.includes('n8n.cloud')) {
      return {
        isConfigured: true,
        mode: 'cloud',
        host,
        message: `N8N webhook 已設定（雲端：${host}）`,
      }
    }

    return {
      isConfigured: true,
      mode: 'custom',
      host,
      message: `N8N webhook 已設定（自架 / 自訂網域：${host}）`,
    }
  } catch {
    return {
      isConfigured: true,
      mode: 'unknown',
      host: null,
      message: 'N8N webhook 已設定，但網址格式無法解析',
    }
  }
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const discord = getDiscordConfigStatus()
  const resendConfigured =
    !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL
  const webhookUrl =
    process.env.N8N_ORDER_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_ORDER_WEBHOOK_URL

  return NextResponse.json({
    success: true,
    data: {
      resend: {
        isConfigured: resendConfigured,
        message: resendConfigured
          ? 'Resend 已設定，可發送客戶 Email'
          : 'Resend 未完整設定（需 RESEND_API_KEY + RESEND_FROM_EMAIL）',
      },
      discord,
      n8n: detectN8nMode(webhookUrl),
    },
  })
}
