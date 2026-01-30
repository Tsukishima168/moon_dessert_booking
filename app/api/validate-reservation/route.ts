import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// 驗證預訂日期
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const isRushOrder = searchParams.get('is_rush') === 'true';

        if (!date) {
            return NextResponse.json({ error: '缺少日期參數' }, { status: 400 });
        }

        const supabase = createClient();

        const { data, error } = await supabase.rpc('validate_reservation', {
            pickup_date: date,
            is_rush_order: isRushOrder,
        });

        if (error) {
            console.error('驗證預訂錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const result = data?.[0] || {
            valid: true,
            reason: '符合預訂規則',
            min_date: null,
            max_date: null,
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('API 錯誤 - 驗證預訂:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
