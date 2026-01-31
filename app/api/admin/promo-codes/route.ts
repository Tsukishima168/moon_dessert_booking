import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET - 取得所有優惠碼
export async function GET() {
    try {
        const supabase = createClient();

        const { data: promoCodes, error } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('取得優惠碼錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(promoCodes || []);
    } catch (error) {
        console.error('API 錯誤 - 取得優惠碼 (admin):', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - 新增優惠碼
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = createClient();

        // 基本驗證
        if (!body.code || !body.discount_type || body.discount_value === undefined) {
            return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('promo_codes')
            .insert({
                code: body.code.toUpperCase(), // 強制大寫
                description: body.description || null,
                discount_type: body.discount_type, // 'percentage' | 'fixed'
                discount_value: body.discount_value,
                min_order_amount: body.min_order_amount || 0,
                max_uses: body.max_uses || null,
                valid_from: body.valid_from || new Date().toISOString(),
                valid_until: body.valid_until || null,
                is_active: body.is_active !== undefined ? body.is_active : true,
            })
            .select()
            .single();

        if (error) {
            console.error('新增優惠碼錯誤:', error);
            // 處理重複 Code
            if (error.code === '23505') {
                return NextResponse.json({ error: '優惠碼已存在' }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API 錯誤 - 新增優惠碼:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT - 更新優惠碼
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: '缺少優惠碼 ID' }, { status: 400 });
        }

        const supabase = createClient();

        // 如果有更新 code，強制大寫
        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase();
        }

        const { data, error } = await supabase
            .from('promo_codes')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('更新優惠碼錯誤:', error);
            if (error.code === '23505') {
                return NextResponse.json({ error: '優惠碼已存在' }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API 錯誤 - 更新優惠碼:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - 刪除優惠碼
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: '缺少優惠碼 ID' }, { status: 400 });
        }

        const supabase = createClient();

        const { error } = await supabase
            .from('promo_codes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('刪除優惠碼錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API 錯誤 - 刪除優惠碼:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
