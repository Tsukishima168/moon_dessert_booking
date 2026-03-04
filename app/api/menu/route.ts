import { NextRequest, NextResponse } from 'next/server';
import { getMenuItems } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/menu - 取得菜單列表
// 支援 MBTI 參數：/api/menu?mbti=INFP
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mbtiType = searchParams.get('mbti');

    const menuItems = await getMenuItems(mbtiType || undefined);

    return NextResponse.json({
      success: true,
      data: menuItems,
      mbti_type: mbtiType,
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
