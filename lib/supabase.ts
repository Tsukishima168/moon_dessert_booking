import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSeasonallyDisabledMenuItemName } from '@/src/lib/seasonal-menu';
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope';
import { createSharedAuthStorage } from '@/src/lib/auth-storage';

// 惰性初始化：避免在建置期間因環境變數尚未注入而導致崩潰
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 環境變數');
  }
  if (!supabaseAnonKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY 環境變數');
  }

  const isBrowser = typeof window !== 'undefined';

  // 瀏覽器環境才 persist session（localStorage），
  // Server 環境（API Route / SSR）不做 persist，避免 crash
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: isBrowser,
      detectSessionInUrl: isBrowser,
      autoRefreshToken: isBrowser,
      storage: isBrowser ? createSharedAuthStorage() : undefined,
    },
  });

  return _supabase;
}

// 向後相容的 getter：確保現有程式碼無需修改
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as any)[prop];
  },
});

// 型別定義
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string;
  is_available: boolean;
  sort_order?: number;
  // 電商內容欄位（P0-2，全部 optional：DB 尚未套用 migration 時容忍缺欄）
  tagline?: string;
  size_info?: string;
  ingredients?: string[];
  allergens?: string[];
  storage_info?: string;
  delivery_type?: 'pickup_only' | 'delivery_ok' | 'both';
  lead_time_days?: number;
  gallery_urls?: string[];
  included_items?: string;
  available_from?: string;
  available_until?: string;
  slug?: string;
}

export interface MenuVariant {
  id: string;
  menu_item_id: string;
  variant_name: string;
  price: number;
  sort_order?: number;
}

export interface MenuItemWithVariants extends MenuItem {
  variants: MenuVariant[];
  price: number; // 最低價格
  recommended?: boolean; // MBTI 推薦標記
  reason?: string; // 推薦理由
}

export interface MenuCategory {
  id: string;
  name: string;
  title?: string;
  subtitle?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  variant_name?: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  email?: string | null;
  phone: string;
  pickup_time: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  mbti_type?: string;
  from_mbti_test?: boolean;
  checkout_site?: string;
  source_from?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  promo_code?: string;
  discount_amount?: number;
  original_price?: number;
  final_price?: number;
  created_at: string;
  user_id?: string;
  linepay_transaction_id?: string | null;
}

interface MBTIMenuLink {
  mbti_type: string;
  menu_item_id: string | null;
  linkage_type: string;
  soul_dessert_name: string;
  display_name_override?: string | null;
  display_description_override?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface MBTIDessertContract {
  mbti_type: string;
  linkage_type: string;
  menu_item_id: string | null;
  soul_dessert_name: string;
  canonical_name: string | null;
  display_name: string;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  prices: Array<{
    spec: string;
    price: number;
  }>;
}

const parsePrice = (raw: any): number => {
  if (raw === null || raw === undefined) return 0;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  const value = cleaned === '' ? NaN : Number(cleaned);
  return Number.isFinite(value) ? value : 0;
};

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  description?: string;
}

export interface PromoCodeValidation {
  valid: boolean;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount: number;
  final_amount: number;
  message: string;
}

// 取得分類列表
export async function getCategories(): Promise<MenuCategory[]> {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((cat) => ({
      id: cat.id.toString(),
      name: cat.name || cat.title || '',
      title: cat.title || cat.name || '',
      subtitle: cat.subtitle || null,
      sort_order: cat.sort_order || 0,
      is_active: true,
    }));
  } catch (error) {
    console.error('讀取分類錯誤:', error);
    return [];
  }
}

async function getMBTIMenuLinks(mbtiType: string): Promise<MBTIMenuLink[]> {
  const { data, error } = await supabase
    .from('mbti_menu_links')
    .select('*')
    .eq('mbti_type', mbtiType)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) throw error;
  return (data || []) as MBTIMenuLink[];
}

export async function getMBTIDessertContract(mbtiType: string): Promise<MBTIDessertContract | null> {
  const links = await getMBTIMenuLinks(mbtiType);
  const link = links[0];

  if (!link) return null;

  const fallbackDisplayName = link.display_name_override || link.soul_dessert_name;
  const fallbackDescription = link.display_description_override || null;

  if (!link.menu_item_id) {
    return {
      mbti_type: link.mbti_type,
      linkage_type: link.linkage_type,
      menu_item_id: null,
      soul_dessert_name: link.soul_dessert_name,
      canonical_name: null,
      display_name: fallbackDisplayName,
      description: fallbackDescription,
      image_url: null,
      is_available: false,
      prices: [],
    };
  }

  const [{ data: item, error: itemError }, { data: variants, error: variantsError }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('*')
      .eq('id', link.menu_item_id)
      .single(),
    supabase
      .from('menu_variants')
      .select('*')
      .eq('menu_item_id', link.menu_item_id)
      .order('sort_order', { ascending: true }),
  ]);

  if (itemError || !item) {
    throw itemError || new Error(`找不到 menu_item_id=${link.menu_item_id}`);
  }

  if (variantsError) throw variantsError;

  return {
    mbti_type: link.mbti_type,
    linkage_type: link.linkage_type,
    menu_item_id: link.menu_item_id,
    soul_dessert_name: link.soul_dessert_name,
    canonical_name: item.name || item.title || null,
    display_name: fallbackDisplayName,
    description: fallbackDescription || item.description || null,
    image_url: item.image_url || item.image || null,
    is_available: item.is_available !== false,
    prices: (variants || []).map((variant) => ({
      spec: variant.variant_name || variant.spec || '標準',
      price: parsePrice(variant.price),
    })),
  };
}

// 取得菜單資料（結合 menu_items 和 menu_variants）
export async function getMenuItems(mbtiType?: string): Promise<MenuItemWithVariants[]> {
  try {
    // 1. 取得所有菜單項目
    const { data: menuItems, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (itemsError) throw itemsError;
    if (!menuItems) return [];

    // 2. 取得所有變體（價格）
    const { data: variants, error: variantsError } = await supabase
      .from('menu_variants')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (variantsError) throw variantsError;

    // 3. 如果有 MBTI，取得推薦
    let recommendations: MBTIMenuLink[] = [];
    if (mbtiType) {
      recommendations = await getMBTIMenuLinks(mbtiType);
    }

    // 4. 組合資料
    const menuWithVariants: MenuItemWithVariants[] = menuItems
      .filter((item) => !isSeasonallyDisabledMenuItemName(item.name || item.title || ''))
      .map((item) => {
        const itemVariants = variants?.filter(
          (v) => v.menu_item_id === item.id
        ) || [];

        // 取得最低價格
        const minPrice = itemVariants.length > 0
          ? Math.min(...itemVariants.map((v) => parsePrice(v.price)))
          : 0;

        // 檢查是否為 MBTI 推薦
        const recommendation = recommendations.find(r => r.menu_item_id === item.id);

        return {
          id: item.id.toString(),
          name: item.name || item.title || '',
          description: item.description || '',
          category: item.category || item.category_id?.toString() || '',
          image_url: item.image_url || item.image || '',
          is_available: item.is_available !== false,
          sort_order: item.sort_order ?? 0,
          // 電商內容欄位（P0-2）：DB 尚未套用 migration 時欄位不存在，容忍為 undefined
          tagline: item.tagline ?? undefined,
          size_info: item.size_info ?? undefined,
          ingredients: item.ingredients ?? undefined,
          allergens: item.allergens ?? undefined,
          storage_info: item.storage_info ?? undefined,
          delivery_type: item.delivery_type ?? undefined,
          lead_time_days: item.lead_time_days ?? undefined,
          gallery_urls: item.gallery_urls ?? undefined,
          included_items: item.included_items ?? undefined,
          available_from: item.available_from ?? undefined,
          available_until: item.available_until ?? undefined,
          slug: item.slug ?? undefined,
          variants: itemVariants.map((v) => ({
            id: v.id.toString(),
            menu_item_id: v.menu_item_id.toString(),
            variant_name: v.variant_name || v.spec || '標準',
            price: parsePrice(v.price),
            sort_order: v.sort_order ?? 0,
          })),
          price: minPrice,
          recommended: !!recommendation,
          reason: recommendation?.notes || undefined,
        };
      });

    console.log(`成功讀取 ${menuWithVariants.length} 個菜單項目`);
    return menuWithVariants;
  } catch (error) {
    console.error('讀取菜單資料錯誤:', error);
    throw new Error('無法讀取菜單資料');
  }
}

// 依 slug 或 id 取得單一商品（P0-1 商品詳情頁用）：先按 slug 比對，查無再按 id 比對。
// 沿用 getMenuItems() 既有容錯/組裝邏輯（含 variants、seasonal 過濾、欄位缺失容忍），避免另開一條查詢路徑。
export async function getMenuItemBySlugOrId(
  idOrSlug: string
): Promise<MenuItemWithVariants | null> {
  const items = await getMenuItems();
  const bySlug = items.find((item) => item.slug && item.slug === idOrSlug);
  if (bySlug) return bySlug;
  const byId = items.find((item) => item.id === idOrSlug);
  return byId ?? null;
}

export async function getGroupedMenuCategories() {
  const [categories, menuItems] = await Promise.all([
    getCategories(),
    getMenuItems(),
  ]);

  return categories.map((category) => ({
    id: category.id,
    title: category.title || category.name,
    subtitle: category.subtitle ?? null,
    sort_order: category.sort_order ?? 0,
    items: menuItems
      .filter((item) => item.category === category.id)
      .map((item) => ({
        name: item.name,
        description: item.description ?? null,
        image: item.image_url || null,
        prices: item.variants
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((variant) => ({
            spec: variant.variant_name,
            price: variant.price,
          })),
      })),
  }));
}

// 建立訂單
export async function createOrder(orderData: {
  customer_name: string;
  phone: string;
  email?: string;
  pickup_time: string;
  items: OrderItem[];
  total_price: number;
  mbti_type?: string;
  from_mbti_test?: boolean;
  source_from?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  promo_code?: string;
  discount_amount?: number;
  original_price?: number;
  final_price?: number;
  payment_date?: string;
  delivery_method?: 'pickup' | 'delivery';
  delivery_address?: string;
  delivery_fee?: number;
  delivery_notes?: string;
  user_id?: string;
}): Promise<{ success: boolean; order_id: string }> {
  try {
    const order_id = `ORD${Date.now()}`;

    const { error } = await supabase.from('orders').insert({
      order_id,
      customer_name: orderData.customer_name,
      phone: orderData.phone,
      email: orderData.email || null,
      pickup_time: orderData.pickup_time,
      items: orderData.items,
      total_price: orderData.final_price || orderData.total_price,
      mbti_type: orderData.mbti_type,
      from_mbti_test: orderData.from_mbti_test || false,
      checkout_site: SHOP_CHECKOUT_SITE,
      source_from: orderData.source_from || null,
      utm_source: orderData.utm_source || null,
      utm_medium: orderData.utm_medium || null,
      utm_campaign: orderData.utm_campaign || null,
      utm_content: orderData.utm_content || null,
      utm_term: orderData.utm_term || null,
      promo_code: orderData.promo_code || null,
      discount_amount: orderData.discount_amount || 0,
      original_price: orderData.original_price || orderData.total_price,
      final_price: orderData.final_price || orderData.total_price,
      payment_date: orderData.payment_date || null,
      delivery_method: orderData.delivery_method || 'pickup',
      delivery_address: orderData.delivery_address || null,
      delivery_fee: orderData.delivery_fee || 0,
      delivery_notes: orderData.delivery_notes || null,
      user_id: orderData.user_id || null,
      status: 'pending',
    });

    if (error) throw error;

    console.log(`成功建立訂單: ${order_id}`);
    return { success: true, order_id };
  } catch (error) {
    console.error('建立訂單錯誤:', error);
    throw error;
  }
}

// 註：getAllOrders() / updateOrderStatus() 已於安全稽核中移除。
// 兩者皆使用前端 anon client 直接對 orders 表做 select('*') / update，
// 且經全庫掃描確認零呼叫端（僅本檔自我定義），屬於死代碼。
// 後台讀取訂單一律走 src/repositories/order.repository.ts（createAdminClient，
// service_role，繞過 RLS，自行以 user_id / checkout_site 過濾），
// 不應再新增依賴 anon client 直接查/改 orders 的路徑。

// 檢查日期是否可預訂
export interface DateAvailability {
  date: string;
  available: boolean;
  reason?: string;
  type?: string;
  current_count?: number;
  limit_count?: number;
}

export async function checkDateAvailability(
  date: string,
  deliveryMethod: 'pickup' | 'delivery' = 'pickup'
): Promise<DateAvailability> {
  try {
    const { data, error } = await supabase.rpc('check_date_availability', {
      check_date: date,
      delivery_method_param: deliveryMethod,
    });

    if (error) throw error;

    return {
      date,
      available: data?.available ?? false,
      reason: data?.reason,
      type: data?.type,
      current_count: data?.current_count,
      limit_count: data?.limit,
    };
  } catch (error) {
    console.error('檢查日期可用性錯誤:', error);
    // 如果函數不存在，返回預設值（允許預訂）
    return {
      date,
      available: true,
    };
  }
}

// 取得可預訂日期列表
export async function getAvailableDates(
  startDate: string,
  endDate: string,
  deliveryMethod: 'pickup' | 'delivery' = 'pickup'
): Promise<DateAvailability[]> {
  try {
    const { data, error } = await supabase.rpc('get_available_dates', {
      start_date: startDate,
      end_date: endDate,
      delivery_method_param: deliveryMethod,
    });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      date: item.date,
      available: item.available,
      reason: item.reason,
      type: item.type,
      current_count: item.current_count,
      limit_count: item.limit_count,
    }));
  } catch (error) {
    console.error('取得可預訂日期錯誤:', error);
    // 如果函數不存在，返回空陣列
    return [];
  }
}

// 取得營業設定
export async function getBusinessSettings(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('setting_key, setting_value');

    if (error) throw error;

    const settings: Record<string, any> = {};
    (data || []).forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    return settings;
  } catch (error) {
    console.error('取得營業設定錯誤:', error);
    return {};
  }
}

// 驗證優惠碼
export async function validatePromoCode(
  code: string,
  orderAmount: number
): Promise<PromoCodeValidation> {
  try {
    // 查詢優惠碼
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promoCode) {
      return {
        valid: false,
        discount_amount: 0,
        final_amount: orderAmount,
        message: '找不到此優惠碼',
      };
    }

    // 檢查有效期間
    const now = new Date();
    const validFrom = new Date(promoCode.valid_from);
    const validUntil = promoCode.valid_until ? new Date(promoCode.valid_until) : null;

    if (now < validFrom) {
      return {
        valid: false,
        discount_amount: 0,
        final_amount: orderAmount,
        message: '此優惠碼尚未生效',
      };
    }

    if (validUntil && now > validUntil) {
      return {
        valid: false,
        discount_amount: 0,
        final_amount: orderAmount,
        message: '此優惠碼已過期',
      };
    }

    // 檢查使用次數上限
    if (promoCode.max_uses && promoCode.used_count >= promoCode.max_uses) {
      return {
        valid: false,
        discount_amount: 0,
        final_amount: orderAmount,
        message: '此優惠碼已達使用上限',
      };
    }

    // 檢查最低消費
    if (promoCode.min_order_amount && orderAmount < promoCode.min_order_amount) {
      return {
        valid: false,
        discount_amount: 0,
        final_amount: orderAmount,
        message: `訂單未達最低消費 $${promoCode.min_order_amount}`,
      };
    }

    // 計算折扣金額
    let discountAmount = 0;
    if (promoCode.discount_type === 'percentage') {
      discountAmount = Math.round((orderAmount * promoCode.discount_value) / 100);
    } else {
      discountAmount = promoCode.discount_value;
    }

    // 確保折扣不超過訂單金額
    discountAmount = Math.min(discountAmount, orderAmount);

    const finalAmount = orderAmount - discountAmount;

    return {
      valid: true,
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      message: promoCode.description || `優惠碼已套用，折扣 $${discountAmount}`,
    };
  } catch (error) {
    console.error('驗證優惠碼錯誤:', error);
    return {
      valid: false,
      discount_amount: 0,
      final_amount: orderAmount,
      message: '驗證優惠碼時發生錯誤',
    };
  }
}
