import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email ?? null,
    });
  } catch (error) {
    console.error('[GET /api/auth/me] error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve auth user' },
      { status: 500 }
    );
  }
}
