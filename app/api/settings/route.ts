import { NextResponse } from 'next/server'
import { fetchBusinessSettings } from '@/src/repositories/settings.repository'

export const dynamic = 'force-dynamic'

// GET /api/settings - 公開的店家設定（供前台結帳頁使用）
export async function GET() {
  try {
    const settings = await fetchBusinessSettings()
    return NextResponse.json(settings)
  } catch {
    // 失敗時回傳空物件，讓前台使用 default 值
    return NextResponse.json({}, { status: 200 })
  }
}
