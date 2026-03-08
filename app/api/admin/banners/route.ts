import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin';

export const dynamic = 'force-dynamic';

// GET - 取得所有 Banner (後台用,包含未啟用的)
export async function GET() {
    try {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createAdminClient();

        const { data: banners, error } = await supabase
            .from('banners')
            .select('*')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('取得 Banner 錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(banners || []);
    } catch (error) {
        console.error('API 錯誤 - 取得 Banner (admin):', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - 新增 Banner
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('banners')
            .insert({
                title: body.title,
                description: body.description || null,
                image_url: body.image_url || null,
                link_url: body.link_url || null,
                link_text: body.link_text || '立即查看',
                background_color: body.background_color || '#d4a574',
                text_color: body.text_color || '#0a0a0a',
                is_active: body.is_active || false,
                priority: body.priority || 0,
                display_type: body.display_type || 'hero',
                start_date: body.start_date || null,
                end_date: body.end_date || null,
            })
            .select()
            .single();

        if (error) {
            console.error('新增 Banner 錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API 錯誤 - 新增 Banner:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT - 更新 Banner
export async function PUT(request: NextRequest) {
    try {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: '缺少 Banner ID' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('banners')
            .update({
                ...updateData,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('更新 Banner 錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API 錯誤 - 更新 Banner:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - 刪除 Banner
export async function DELETE(request: NextRequest) {
    try {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: '缺少 Banner ID' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from('banners')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('刪除 Banner 錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API 錯誤 - 刪除 Banner:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
