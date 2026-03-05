import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const menuItemId = searchParams.get('menu_item_id');

    if (!date) {
      return NextResponse.json(
        { error: 'date parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 獲取指定菜單項目或所有菜單項目的可用性
    let query = supabase
      .rpc('check_menu_item_availability', {
        menu_item_id_param: menuItemId || null,
        delivery_date: date,
        current_time: new Date().toISOString(),
      });

    const { data, error } = await query;

    if (error) {
      console.error('RPC 錯誤:', error);
      // 如果 RPC 失敗，返回預設可用
      return NextResponse.json({
        available: true,
        reason: '無法驗證，預設可用',
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('菜單項目可用性檢查錯誤:', error);
    return NextResponse.json(
      {
        available: true,
        reason: '系統錯誤，預設可用',
      },
      { status: 200 } // 返回 200 以避免前端報錯
    );
  }
}
