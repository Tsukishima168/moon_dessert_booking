import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import {
  fetchBusinessSettings,
  updateBusinessSetting,
} from '@/src/repositories/settings.repository'

export const dynamic = 'force-dynamic'

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// GET - 取得所有營業設定（key-value map）
export async function GET() {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const settings = await fetchBusinessSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('API 錯誤 - 取得營業設定:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT - 更新單一營業設定
export async function PUT(request: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const { setting_key, setting_value } = await request.json()
    if (!setting_key) {
      return NextResponse.json({ error: '缺少 setting_key' }, { status: 400 })
    }
    const data = await updateBusinessSetting(setting_key, setting_value)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API 錯誤 - 更新營業設定:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
