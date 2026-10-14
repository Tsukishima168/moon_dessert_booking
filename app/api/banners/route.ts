import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isSameOriginMutation } from '@/src/lib/request-origin';
import { bannerStatRateKey } from '@/src/lib/banner-stat-key';

export const dynamic = 'force-dynamic';

// GET - 取得啟用中的 Banner
export async function GET() {
    try {
        const supabase = await createClient();
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
            return NextResponse.json({ error: '目前無法載入公告，請稍後重試。' }, { status: 500 });
        }

        return NextResponse.json(banners || []);
    } catch (error) {
        console.error('API 錯誤 - 取得 Banner:', error);
        return NextResponse.json({ error: '目前無法處理公告資訊，請稍後重試。' }, { status: 500 });
    }
}

// POST - 記錄 Banner 顯示/點擊
export async function POST(request: NextRequest) {
    if (!isSameOriginMutation(request)) return NextResponse.json({ error: '請從本站重新操作。' }, { status: 403 });
    try {
        const raw = await request.text();
        if (raw.length > 1024) return NextResponse.json({ error: '資料過長。' }, { status: 413 });
        const { bannerId, action, impressionId } = JSON.parse(raw);
        const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        if (typeof bannerId !== 'string' || typeof impressionId !== 'string' || !uuid.test(bannerId) || !uuid.test(impressionId) || !['view', 'click'].includes(action)) {
            return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
        }

        const rateKey = bannerStatRateKey(request);
        if (!rateKey) return NextResponse.json({ error: '目前無法記錄公告統計。' }, { status: 503 });
        const { data, error } = await createAdminClient().rpc('record_shop_banner_event', {
            p_banner_id: bannerId, p_impression_id: impressionId, p_action: action, p_rate_key: rateKey,
        });
        if (error) return NextResponse.json({ error: '目前無法記錄公告統計。' }, { status: 503 });
        return NextResponse.json({ success: true, recorded: data === true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('API 錯誤 - 記錄 Banner 統計:', error);
        return NextResponse.json({ error: '目前無法處理公告資訊，請稍後重試。' }, { status: 500 });
    }
}
