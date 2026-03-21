import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET - 取得啟用中的 Banner
export async function GET() {
    try {
        const supabase = createClient();
        const now = new Date().toISOString();

        const { data: banners, error } = await supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .or(`start_date.is.null,start_date.lte.${now}`)
            .or(`end_date.is.null,end_date.gte.${now}`)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            const isMissingTable =
                error.code === '42P01' ||
                /relation .*banners.* does not exist/i.test(error.message || '');

            if (isMissingTable) {
                return NextResponse.json([]);
            }

            console.error('取得 Banner 錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(banners || []);
    } catch (error) {
        console.error('API 錯誤 - 取得 Banner:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - 記錄 Banner 顯示/點擊
export async function POST(request: NextRequest) {
    try {
        const { bannerId, action } = await request.json();

        if (!bannerId || !action) {
            return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API 錯誤 - 記錄 Banner 統計:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
