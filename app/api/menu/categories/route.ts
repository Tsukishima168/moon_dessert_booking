import { NextResponse } from 'next/server';
import { getGroupedMenuCategories } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * GET /api/menu/categories
 *
 * 公開 API：回傳菜單分類 + 商品（grouped）格式。
 * 供所有外部站點（moon_map、MBTI、Passport 等）使用。
 *
 * 憲法法條 1：外部站點禁止直連 DB，一律呼叫此 endpoint。
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: string,
 *       title: string,
 *       subtitle: string | null,
 *       sort_order: number,
 *       items: [
 *         {
 *           name: string,
 *           description: string | null,
 *           image: string | null,
 *           prices: Array<{ spec: string; price: number; sort_order: number }>
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const data = await getGroupedMenuCategories();

    return NextResponse.json(
      { success: true, data },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[API] /api/menu/categories error:', error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        message:
          error instanceof Error ? error.message : '取得菜單分類失敗',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
