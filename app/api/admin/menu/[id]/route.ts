import { ensureAdmin } from '../../_utils/ensureAdmin';
import { NextRequest, NextResponse } from 'next/server';
import {
    editMenuItem,
    removeMenuItem,
} from '@/src/services/menu.service';

const isInvalidCategoryError = (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23503' &&
    String((error as { message?: unknown }).message ?? '').includes('menu_items_category_id_fkey');

async function updateMenuItemFromRequest(
    req: NextRequest,
    params: Promise<{ id: string }>
) {
    try {
        // 檢查認證
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id } = await params;
        const data = await editMenuItem({ ...body, id });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        if (isInvalidCategoryError(error)) {
            return NextResponse.json(
                { error: 'Invalid category' },
                { status: 400 }
            );
        }
        console.error('UPDATE /api/admin/menu/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to update menu item' },
            { status: 500 }
        );
    }
}

// PATCH - 更新菜單項目（如切換上/下架）
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return updateMenuItemFromRequest(req, params);
}

// PUT - 編輯菜單項目（管理頁表單使用）
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return updateMenuItemFromRequest(req, params);
}

// DELETE - 刪除菜單項目
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 檢查認證
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await removeMenuItem(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/menu/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete menu item' },
            { status: 500 }
        );
    }
}
