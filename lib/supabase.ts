import { createClient } from '@supabase/supabase-js';

// 環境變數驗證
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 環境變數');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY 環境變數');
}

// 建立 Supabase Client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 型別定義
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string;
  is_available: boolean;
}

export interface MenuVariant {
  id: string;
  menu_item_id: string;
  variant_name: string;
  price: number;
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
  phone: string;
  pickup_time: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  mbti_type?: string;
  from_mbti_test?: boolean;
  promo_code?: string;
  discount_amount?: number;
  original_price?: number;
  final_price?: number;
  created_at: string;
}

export interface MBTIRecommendation {
  id: string;
  mbti_type: string;
  menu_item_id: string;
  reason: string;
  priority: number;
}

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
      sort_order: cat.sort_order || 0,
      is_active: true,
    }));
  } catch (error) {
    console.error('讀取分類錯誤:', error);
    return [];
  }
}

// 取得菜單資料（結合 menu_items 和 menu_variants）
export async function getMenuItems(mbtiType?: string): Promise<MenuItemWithVariants[]> {
  try {
    // 將資料庫中的價格欄位轉成乾淨的數字（去掉 $、逗號等）
    const parsePrice = (raw: any): number => {
      if (raw === null || raw === undefined) return 0;
      // 先轉成字串，移除非數字與小數點，再轉回數字
      const cleaned = String(raw).replace(/[^0-9.]/g, '');
      const value = cleaned === '' ? NaN : Number(cleaned);
      return Number.isFinite(value) ? value : 0;
    };

    // 1. 取得所有菜單項目
    const { data: menuItems, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .order('id');

    if (itemsError) throw itemsError;
    if (!menuItems) return [];

    // 2. 取得所有變體（價格）
    const { data: variants, error: variantsError } = await supabase
      .from('menu_variants')
      .select('*');

    if (variantsError) throw variantsError;

    // 3. 如果有 MBTI，取得推薦
    let recommendations: MBTIRecommendation[] = [];
    if (mbtiType) {
      const { data: recs } = await supabase
        .from('mbti_recommendations')
        .select('*')
        .eq('mbti_type', mbtiType)
        .order('priority', { ascending: false });

      recommendations = recs || [];
    }

    // 4. 組合資料
    const menuWithVariants: MenuItemWithVariants[] = menuItems.map((item) => {
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
        variants: itemVariants.map((v) => ({
          id: v.id.toString(),
          menu_item_id: v.menu_item_id.toString(),
          variant_name: v.variant_name || v.spec || '標準',
          price: parsePrice(v.price),
        })),
        price: minPrice,
        recommended: !!recommendation,
        reason: recommendation?.reason,
      };
    });

    console.log(`成功讀取 ${menuWithVariants.length} 個菜單項目`);
    return menuWithVariants;
  } catch (error) {
    console.error('讀取菜單資料錯誤:', error);
    throw new Error('無法讀取菜單資料');
  }
}

// 取得 MBTI 推薦商品
export async function getMBTIRecommendations(mbtiType: string): Promise<MenuItemWithVariants[]> {
  try {
    const allItems = await getMenuItems(mbtiType);
    return allItems.filter(item => item.recommended);
  } catch (error) {
    console.error('讀取 MBTI 推薦錯誤:', error);
    return [];
  }
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
  promo_code?: string;
  discount_amount?: number;
  original_price?: number;
  final_price?: number;
  payment_date?: string;
  delivery_method?: 'pickup' | 'delivery';
  delivery_address?: string;
  delivery_fee?: number;
  delivery_notes?: string;
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
      promo_code: orderData.promo_code || null,
      discount_amount: orderData.discount_amount || 0,
      original_price: orderData.original_price || orderData.total_price,
      final_price: orderData.final_price || orderData.total_price,
      payment_date: orderData.payment_date || null,
      delivery_method: orderData.delivery_method || 'pickup',
      delivery_address: orderData.delivery_address || null,
      delivery_fee: orderData.delivery_fee || 0,
      delivery_notes: orderData.delivery_notes || null,
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

// 取得所有訂單（管理用）
export async function getAllOrders(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((order) => ({
      id: order.id.toString(),
      order_id: order.order_id,
      customer_name: order.customer_name,
      phone: order.phone,
      pickup_time: order.pickup_time,
      items: order.items,
      total_price: order.total_price,
      status: order.status,
      mbti_type: order.mbti_type,
      from_mbti_test: order.from_mbti_test,
      created_at: order.created_at,
    }));
  } catch (error) {
    console.error('讀取訂單錯誤:', error);
    throw error;
  }
}

// 更新訂單狀態
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', orderId);

    if (error) throw error;

    console.log(`訂單 ${orderId} 狀態更新為: ${status}`);
    return true;
  } catch (error) {
    console.error('更新訂單狀態錯誤:', error);
    throw error;
  }
}

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

