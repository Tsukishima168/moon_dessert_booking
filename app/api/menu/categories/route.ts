import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isSeasonallyDisabledMenuItemName } from '@/src/lib/seasonal-menu';

export const dynamic = 'force-dynamic';

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
export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. 取分類（依 sort_order 排序）
    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('id, title, subtitle, sort_order')
      .order('sort_order', { ascending: true });

    if (catError) throw catError;
    if (!categories || categories.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. 取上架商品（含 variants）
    const { data: items, error: itemError } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        description,
        image_url,
        image,
        image_path,
        category_id,
        sort_order,
        is_available,
        menu_variants (
          spec,
          price,
          sort_order
        )
      `)
      .eq('is_available', true)
      .order('sort_order', { ascending: true });

    if (itemError) throw itemError;

    // 3. 組合為 grouped 格式
    const data = categories.map((cat) => {
      const catItems = (items || [])
        .filter((item) => item.category_id === cat.id)
        .filter((item) => !isSeasonallyDisabledMenuItemName(item.name))
        .map((item) => {
          const variants = (item.menu_variants ?? []) as Array<{
            spec: string;
            price: number;
            sort_order: number;
          }>;
          return {
            name: item.name,
            description: item.description ?? null,
            image:
              item.image_url ??
              item.image ??
              item.image_path ??
              null,
            prices: variants
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map(({ spec, price }) => ({ spec, price })),
          };
        });

      return {
        id: cat.id,
        title: cat.title,
        subtitle: cat.subtitle ?? null,
        sort_order: cat.sort_order ?? 0,
        items: catItems,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] /api/menu/categories error:', error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        message:
          error instanceof Error ? error.message : '取得菜單分類失敗',
      },
      { status: 500 }
    );
  }
}
