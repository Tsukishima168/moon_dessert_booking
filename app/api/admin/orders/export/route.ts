import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '../../_utils/ensureAdmin'
import { createAdminClient } from '@/lib/supabase-admin'
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope'

interface ExportOrderItem {
  name: string
  variant_name?: string
  quantity: number
  price: number
}

interface ExportOrder {
  order_id: string
  created_at: string
  customer_name: string
  phone: string
  pickup_time: string
  status: string
  items: ExportOrderItem[]
  final_price: number
  total_price: number
  payment_method: string | null
  admin_notes: string | null
}

function csvEscape(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildItemsSummary(items: ExportOrderItem[]): string {
  return items
    .map(item => {
      const v = item.variant_name ? `(${item.variant_name})` : ''
      return `${item.name}${v}x${item.quantity}`
    })
    .join(', ')
}

// GET /api/admin/orders/export?status=paid&date_from=2024-01-01&date_to=2024-01-31
export async function GET(request: NextRequest) {
  const isAdmin = await ensureAdmin()
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const adminClient = createAdminClient()
    let query = adminClient
      .from('orders')
      .select('order_id, created_at, customer_name, phone, pickup_time, status, items, final_price, total_price, payment_method, admin_notes')
      .eq('checkout_site', SHOP_CHECKOUT_SITE)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`)
    }

    const { data, error } = await query
    if (error) throw error

    const orders = (data || []) as ExportOrder[]

    const csvHeaders = [
      'order_id',
      'created_at',
      'customer_name',
      'customer_phone',
      'pickup_time',
      'status',
      'items_summary',
      'total_amount',
      'payment_method',
      'admin_notes',
    ]

    const rows = orders.map(o => [
      csvEscape(o.order_id),
      csvEscape(o.created_at),
      csvEscape(o.customer_name),
      csvEscape(o.phone),
      csvEscape(o.pickup_time),
      csvEscape(o.status),
      csvEscape(buildItemsSummary(o.items || [])),
      csvEscape(o.final_price ?? o.total_price ?? 0),
      csvEscape(o.payment_method),
      csvEscape(o.admin_notes),
    ])

    const csv = '\uFEFF' + [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders_export.csv"',
      },
    })
  } catch (error) {
    console.error('匯出訂單 CSV 錯誤:', error)
    return NextResponse.json({ success: false, message: '匯出失敗' }, { status: 500 })
  }
}
