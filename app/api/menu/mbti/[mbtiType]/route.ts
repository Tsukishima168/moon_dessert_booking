import { NextRequest, NextResponse } from 'next/server';
import { getMBTIDessertContract } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// R3：站內跨站連結（shop → map，同屬 *.kiwimu.com）不用 utm_*，
// 改用單一 from=<來源站>_<位置> 參數，讀取端請先讀 from 再 fallback utm_source。
const buildMenuCtaUrl = (mbtiType: string) => {
  const url = new URL('https://map.kiwimu.com/menu');
  url.searchParams.set('from', 'shop_mbti_result_cta');
  url.searchParams.set('mbti', mbtiType.toUpperCase());
  return url.toString();
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mbtiType: string }> }
) {
  try {
    const { mbtiType: rawMbtiType } = await params;
    const mbtiType = rawMbtiType?.trim().toUpperCase();
    if (!mbtiType) {
      return NextResponse.json(
        { success: false, message: '缺少 MBTI 類型', data: null },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const dessert = await getMBTIDessertContract(mbtiType);
    if (!dessert) {
      return NextResponse.json(
        { success: false, message: '找不到 MBTI 對應資料', data: null },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...dessert,
          resolved: Boolean(dessert.menu_item_id),
          cta_url: buildMenuCtaUrl(mbtiType),
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[API] /api/menu/mbti/[mbtiType] error:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '取得 MBTI 甜點對應失敗',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
