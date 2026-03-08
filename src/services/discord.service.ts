import { createAdminClient } from '@/lib/supabase-admin'

export interface DiscordConfigStatus {
  isConfigured: boolean
  status: 'connected' | 'not_configured'
  message: string
}

/**
 * 回傳 Discord Webhook 設定狀態（不暴露實際 URL）
 */
export function getDiscordConfigStatus(): DiscordConfigStatus {
  const isConfigured = !!process.env.DISCORD_WEBHOOK_URL
  return {
    isConfigured,
    status: isConfigured ? 'connected' : 'not_configured',
    message: isConfigured ? 'Discord Webhook 已設定' : 'Discord Webhook 未設定',
  }
}

/**
 * 驗證並儲存 Discord Webhook URL
 * 1. 格式驗證 → 2. 連線測試 → 3. 寫入環境變數 → 4. 記錄 audit log
 * @param webhookUrl - 要儲存的 Webhook URL
 * @throws Error 若 URL 格式無效或連線失敗
 */
export async function saveDiscordWebhook(webhookUrl: string): Promise<void> {
  // 格式驗證
  if (!webhookUrl.includes('discord.com/api/webhooks')) {
    throw new Error('無效的 Webhook URL 格式')
  }

  // 連線測試
  const testResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '🧪 月島甜點 - Webhook 驗證' }),
  })

  if (!testResponse.ok) {
    throw new Error(
      `Webhook URL 無效或已過期 (HTTP ${testResponse.status})`
    )
  }

  // 寫入 runtime 環境變數（重啟後失效，生產需透過 Vercel 設定）
  process.env.DISCORD_WEBHOOK_URL = webhookUrl

  // 記錄 audit log（使用 admin client，非瀏覽器 client）
  const adminClient = createAdminClient()
  await adminClient
    .from('audit_logs')
    .insert({
      user_id: 'admin_manual',
      action: 'discord_webhook_updated',
      details: {
        timestamp: new Date().toISOString(),
        webhookUrlMasked: webhookUrl.substring(0, 40) + '...',
      },
    })
    .then(({ error }) => {
      if (error) console.warn('無法記錄審計日誌:', error)
    })
}
