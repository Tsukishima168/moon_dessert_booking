import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import {
  canUseLinePay,
  getPaymentSettings,
  hasLinePayCredentials,
} from '@/src/services/settings.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [settings, isAdmin] = await Promise.all([
    getPaymentSettings(),
    ensureAdmin(),
  ])

  return NextResponse.json({
    configured: hasLinePayCredentials(),
    enabled: settings.methods.line_pay,
    status: settings.line_pay_status,
    can_use_line_pay: canUseLinePay(settings, isAdmin),
  })
}
