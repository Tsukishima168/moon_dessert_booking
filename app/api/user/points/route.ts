import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getUserPoints } from '@/src/services/reward.service';

/**
 * GET /api/user/points
 * 取得已登入用戶的點數餘額（與 Passport 共用同一 profiles.points 欄位）
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const points = await getUserPoints(user.id);

    return NextResponse.json({ points });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查詢失敗';
    console.error('[GET /api/user/points] 錯誤:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
