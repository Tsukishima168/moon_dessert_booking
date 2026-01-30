import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// 檢查日期產能
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const deliveryMethod = searchParams.get('delivery_method') || 'pickup';

        if (!date) {
            return NextResponse.json({ error: '缺少日期參數' }, { status: 400 });
        }

        const supabase = createClient();

        const { data, error } = await supabase.rpc('check_daily_capacity', {
            check_date: date,
            delivery_method_param: deliveryMethod,
        });

        if (error) {
            console.error('檢查產能錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data?.[0] || {
            date,
            current_count: 0,
            capacity_limit: 5,
            available: true,
            reason: '可以預訂',
        });
    } catch (error) {
        console.error('API 錯誤 - 檢查產能:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
