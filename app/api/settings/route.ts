import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/settings - 公開的店家設定（供前台結帳頁使用）
export async function GET() {
  try {
    const adminClient = createAdminClient();

    const { data: settings, error } = await adminClient
      .from('business_settings')
      .select('setting_key, setting_value')
      .order('setting_key');

    if (error) {
      console.error('取得設定錯誤:', error);
      return NextResponse.json({}, { status: 200 }); // 回傳空物件讓前台用 default
    }

    const result: Record<string, unknown> = {};
    (settings || []).forEach((s) => {
      result[s.setting_key] = s.setting_value;
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
