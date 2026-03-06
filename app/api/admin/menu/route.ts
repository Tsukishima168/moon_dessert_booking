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
            .order('name');

        if (error) throw error;

        // 欄位對齊：處理 category 與 image_url 的兼容性
        const mappedItems = (data || []).map(item => ({
            ...item,
            category: item.category || item.category_id?.toString() || '',
            image_url: item.image_url || item.image || '',
        }));

        return NextResponse.json({
            success: true,
            items: mappedItems
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
                category_id: body.category_id || body.category, // 支援新舊欄位傳入
                description: body.description || null,
                prices: body.prices || body.variants || [], // 對齊資料庫的 prices 欄位
                image: body.image || body.image_url || null, // 對齊資料庫的 image 欄位
                is_available: body.is_available !== false,
                sort_order: body.sort_order || 0,
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
        
        // 準備更新資料，移除不相符的舊欄位名稱
        const { id: _, category, image_url, price, variants, is_active, ...cleanData } = updateData;
        
        const finalUpdateData = {
            ...cleanData,
            category_id: updateData.category_id || category,
            image: updateData.image || image_url,
            prices: updateData.prices || variants || [],
            is_available: updateData.is_available !== undefined ? updateData.is_available : is_active,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await adminClient
            .from('menu_items')
            .update(finalUpdateData)
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
