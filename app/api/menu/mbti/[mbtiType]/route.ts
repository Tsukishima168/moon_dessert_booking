import { NextRequest, NextResponse } from 'next/server';
import { getMBTIDessertContract } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const buildMenuCtaUrl = (mbtiType: string) => {
  const url = new URL('https://map.kiwimu.com/menu');
  url.searchParams.set('utm_source', 'mbti-lab');
  url.searchParams.set('utm_medium', 'result-cta');
  url.searchParams.set('utm_campaign', '2026-q2-unified-catalog');
  url.searchParams.set('utm_content', 'soul-dessert-button');
  url.searchParams.set('mbti', mbtiType.toUpperCase());
  return url.toString();
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { mbtiType: string } }
) {
  try {
    const mbtiType = params.mbtiType?.trim().toUpperCase();
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
