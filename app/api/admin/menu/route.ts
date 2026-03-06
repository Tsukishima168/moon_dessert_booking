import { ensureAdmin } from '../_utils/ensureAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// GET - 取得所有菜單項目或特定項目
export async function GET(req: NextRequest) {
    try {
        // 檢查認證 (改用獨立密碼 cookie)
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('menu_items')
            .select('*')
            .order('category, name');

        if (error) throw error;

        return NextResponse.json({
            success: true,
            items: data
        });
    } catch (error) {
        console.error('GET /api/admin/menu error:', error);
        const errorMessage = error instanceof Error
            ? error.message
            : (error && typeof error === 'object' && 'message' in error)
                ? String(error.message)
                : 'Failed to fetch menu items';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

// POST - 建立新菜單項目
export async function POST(req: NextRequest) {
    try {
        // 檢查認證
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // 驗證必要欄位
        if (!body.name || !body.category || body.price === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('menu_items')
            .insert([{
                name: body.name,
                category: body.category,
                description: body.description || null,
                price: body.price,
                image_url: body.image_url || null,
                is_active: body.is_active !== false,
                variants: body.variants || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST /api/admin/menu error:', error);
        return NextResponse.json(
            { error: 'Failed to create menu item' },
            { status: 500 }
        );
    }
}

// PUT - 更新菜單項目
export async function PUT(req: NextRequest) {
    try {
        // 檢查認證
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'ID is required' },
                { status: 400 }
            );
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('menu_items')
            .update({
                ...updateData,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PUT /api/admin/menu error:', error);
        return NextResponse.json(
            { error: 'Failed to update menu item' },
            { status: 500 }
        );
    }
}

// DELETE - 刪除菜單項目
export async function DELETE(req: NextRequest) {
    try {
        // 檢查認證
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'ID is required' },
                { status: 400 }
            );
        }

        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from('menu_items')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/menu error:', error);
        return NextResponse.json(
            { error: 'Failed to delete menu item' },
            { status: 500 }
        );
    }
}
