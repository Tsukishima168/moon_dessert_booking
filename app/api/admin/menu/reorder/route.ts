import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '../../_utils/ensureAdmin'
import { createAdminClient } from '@/lib/supabase-admin'

interface ReorderItem {
  id: string
  sort_order: number
}

// PATCH /api/admin/menu/reorder
// body: { items: [{ id: string, sort_order: number }] }
export async function PATCH(req: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const items: ReorderItem[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    await Promise.all(
      items.map(({ id, sort_order }) =>
        adminClient
          .from('menu_items')
          .update({ sort_order })
          .eq('id', id)
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/admin/menu/reorder error:', error)
    return NextResponse.json({ error: 'Failed to reorder menu items' }, { status: 500 })
  }
}
