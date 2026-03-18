import { NextRequest, NextResponse } from 'next/server';
import { getMenuItems } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/menu - 取得菜單列表
// 支援參數：
//   mbti=INFP     — MBTI 客製化推薦
//   q=關鍵字       — 品名模糊搜尋（前端過濾）
//   category=id   — 依分類篩選
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mbtiType = searchParams.get('mbti');
    const query = searchParams.get('q')?.trim().toLowerCase() ?? '';
    const categoryId = searchParams.get('category') ?? '';

    let menuItems = await getMenuItems(mbtiType || undefined);

    // 關鍵字搜尋（品名、描述）
    if (query) {
      menuItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false)
      );
    }

    // 分類篩選
    if (categoryId) {
      menuItems = menuItems.filter(item => item.category === categoryId);
    }

    return NextResponse.json({
      success: true,
      data: menuItems,
      mbti_type: mbtiType,
      total: menuItems.length,
      message: mbtiType
        ? `為 ${mbtiType} 客製化推薦`
        : '成功取得菜單資料',
    });
  } catch (error) {
    console.error('API 錯誤 - 取得菜單:', error);

    return NextResponse.json(
      {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : '取得菜單資料失敗',
      },
      { status: 500 }
    );
  }
}
