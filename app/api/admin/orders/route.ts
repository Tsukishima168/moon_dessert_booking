import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server-auth';
import { supabase } from '@/lib/supabase';

async function ensureAdmin(request: NextRequest) {
    const supabaseAuth = await createAuthClient();
    const {
        data: { session },
        error,
    } = await supabaseAuth.auth.getSession();

    if (error || !session) return false;

    const role = (session.user.app_metadata?.role || session.user.user_metadata?.role || '')
        .toString()
        .toLowerCase();

    // 雙重驗證：Supabase role=admin 或 ADMIN_EMAILS 白名單
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    const userEmail = (session.user.email || '').toLowerCase();

    return role === 'admin' || adminEmails.includes(userEmail);
}

// GET /api/admin/orders - 取得訂單列表
export async function GET(request: NextRequest) {
    const isAdmin = await ensureAdmin(request);
    if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '100');

        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        // 如果有狀態篩選
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: data || [],
        });
    } catch (error) {
        console.error('取得訂單列表錯誤:', error);
        return NextResponse.json(
            { success: false, message: '取得訂單失敗' },
            { status: 500 }
        );
    }
}
