import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import { fetchBusinessSettings } from '@/src/repositories/settings.repository'
import {
  getStoreInfo,
  getPaymentSettings,
  getDeliverySettings,
  getOrderRules,
  getNotificationSettings,
  getBusinessHours,
} from '@/src/services/settings.service'

export const dynamic = 'force-dynamic'

// GET - 取得「已套預設值」的型別化業務設定（供後台分區設定頁編輯）
// 預設只定義在 service 一處；前台不重複 default 邏輯
export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const map = await fetchBusinessSettings()
    const [
      store_info,
      payment_settings,
      delivery_settings,
      order_rules,
      notification_settings,
      business_hours,
    ] = await Promise.all([
      getStoreInfo(map),
      getPaymentSettings(map),
      getDeliverySettings(map),
      getOrderRules(map),
      getNotificationSettings(map),
      getBusinessHours(map),
    ])
    return NextResponse.json({
      store_info,
      payment_settings,
      delivery_settings,
      order_rules,
      notification_settings,
      business_hours,
    })
  } catch (error) {
    console.error('API 錯誤 - 取得 resolved 業務設定:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
