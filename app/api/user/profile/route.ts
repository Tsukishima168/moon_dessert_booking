import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ProfileUpdatePayload {
  full_name?: string;
  phone?: string;
}

/**
 * GET /api/user/profile
 * 取得已登入用戶的 profile
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    // 若 profiles 表沒有 full_name，fallback 到 Google user_metadata
    const metaName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
    const resolved = profile
      ? {
          ...profile,
          full_name: profile.full_name || metaName,
        }
      : { id: user.id, email: user.email, full_name: metaName };

    return NextResponse.json(resolved);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查詢失敗';
    console.error('[GET /api/user/profile] 錯誤:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/user/profile
 * 更新已登入用戶的 profile（full_name, phone）
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as unknown;
    const { full_name, phone } = body as ProfileUpdatePayload;

    const updates: ProfileUpdatePayload = {};
    if (typeof full_name === 'string') updates.full_name = full_name.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有提供可更新的欄位' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, ...updates }, { onConflict: 'id' })
      .select('id, email, full_name, phone, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失敗';
    console.error('[PATCH /api/user/profile] 錯誤:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
