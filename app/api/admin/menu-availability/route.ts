import { createAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';

export async function GET(req: NextRequest) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('menu_item_availability')
      .select('*');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('菜單可用性查詢錯誤:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      menu_item_id,
      is_available = true,
      available_from = null,
      available_until = null,
      unavailable_dates = [],
      available_weekdays = ['0', '1', '2', '3', '4', '5', '6'],
      min_advance_hours = 24,
      notes = null,
    } = body;

    if (!menu_item_id) {
      return NextResponse.json(
        { error: 'menu_item_id is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 使用 upsert 來新增或更新
    const { data, error } = await adminClient
      .from('menu_item_availability')
      .upsert(
        {
          menu_item_id,
          is_available,
          available_from,
          available_until,
          unavailable_dates,
          available_weekdays,
          min_advance_hours,
          notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'menu_item_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('菜單可用性儲存錯誤:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save availability' },
      { status: 500 }
    );
  }
}
