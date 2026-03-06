import { ensureAdmin } from '../../_utils/ensureAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// PATCH - 更新菜單項目（如切換上/下架）
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 檢查認證
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const id = params.id;

        const adminClient = createAdminClient();
        
        // 準備更新資料，對齊資料庫真實欄位
        const { id: _, category, image_url, price, variants, is_active, ...cleanData } = body;
        
        const finalUpdateData = {
            ...cleanData,
            category_id: body.category_id || category,
            image: body.image || image_url,
            prices: body.prices || variants || [],
            is_available: body.is_available !== undefined ? body.is_available : is_active,
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
        console.error('PATCH /api/admin/menu/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to update menu item' },
            { status: 500 }
        );
    }
}

// DELETE - 刪除菜單項目
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 檢查認證
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = params.id;

        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from('menu_items')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/menu/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete menu item' },
            { status: 500 }
        );
    }
}
