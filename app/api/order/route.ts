import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { OrderItem } from '@/lib/supabase';
import { sendCustomerEmail, notifyNewOrder } from '@/lib/notifications';
import { syncOrderEventToN8n } from '@/lib/integrations/n8n';
import { createAdminClient } from '@/lib/supabase-admin';

// POST /api/order - 建立新訂單
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabaseServer = createClient();

    // 嘗試取得當前用戶
    const {
      data: { user: currentUser },
    } = await supabaseServer.auth.getUser();

    // 驗證必要欄位
    const {
      customer_name,
      phone,
      email,
      pickup_time,
      items,
      total_price,
      promo_code,
      discount_amount,
      original_price,
      final_price,
      payment_date,
      delivery_method,
      delivery_address,
      delivery_fee,
      delivery_notes,
      mbti_type,
      from_mbti_test,
      source_from,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      user_id,
    } = body;

    if (!customer_name || !phone || !pickup_time || !items || !total_price) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少必要欄位',
        },
        { status: 400 }
      );
    }

    // 驗證購物車不是空的
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '購物車是空的',
        },
        { status: 400 }
      );
    }

    // 驗證手機號碼格式
    const phoneRegex = /^[0-9]{8,12}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      return NextResponse.json(
        {
          success: false,
          message: '手機號碼格式不正確',
        },
        { status: 400 }
      );
    }

    const finalPriceValue = final_price ? parseFloat(final_price) : parseFloat(total_price);
    const originalPriceValue = original_price ? parseFloat(original_price) : parseFloat(total_price);
    const discountAmountValue = discount_amount ? parseFloat(discount_amount) : 0;
    const deliveryFeeValue = delivery_fee ? parseFloat(delivery_fee) : 0;

    const order_id = `ORD${Date.now()}`;

    // 使用 Admin client 建立訂單（繞過 RLS，確保插入成功）
    const adminClient = createAdminClient();
    const { error: insertError } = await adminClient.from('orders').insert({
      order_id,
      customer_name,
      phone,
      email: email || null,
      pickup_time,
      items: items as OrderItem[],
      total_price: finalPriceValue,
      mbti_type: mbti_type || null,
      from_mbti_test: !!from_mbti_test,
      source_from: source_from || 'shop',
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
      promo_code: promo_code || null,
      discount_amount: discountAmountValue,
      original_price: originalPriceValue,
      final_price: finalPriceValue,
      payment_date: payment_date || null,
      delivery_method: delivery_method || 'pickup',
      delivery_address: delivery_address || null,
      delivery_fee: deliveryFeeValue,
      delivery_notes: delivery_notes || null,
      user_id: user_id || currentUser?.id || null,
      status: 'pending',
    });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw insertError;
    }

    console.log(`成功建立訂單: ${order_id}`);

    // 發送通知（非同步，不阻塞回應）
    Promise.all([
      // 1. 寄信給客戶（如果有提供 email）
      email ? sendCustomerEmail({
        to: email,
        customerName: customer_name,
        orderId: order_id,
        items: items as OrderItem[],
        totalPrice: finalPriceValue,
        pickupTime: pickup_time,
        promoCode: promo_code,
        discountAmount: discountAmountValue,
        originalPrice: originalPriceValue,
        paymentDate: payment_date,
        deliveryMethod: delivery_method || 'pickup',
        deliveryAddress: delivery_address || null,
        deliveryFee: deliveryFeeValue,
        deliveryNotes: delivery_notes || null,
      }) : Promise.resolve(false),

      // 2. LINE & Discord 通知店家
      notifyNewOrder({
        orderId: order_id,
        customerName: customer_name,
        phone,
        totalPrice: finalPriceValue,
        pickupTime: pickup_time,
        items: items as OrderItem[],
        promoCode: promo_code,
        discountAmount: discountAmountValue,
        originalPrice: originalPriceValue,
        paymentDate: payment_date,
        deliveryMethod: delivery_method || 'pickup',
        deliveryAddress: delivery_address || null,
        deliveryFee: deliveryFeeValue,
        deliveryNotes: delivery_notes || null,
        orderSource: 'shop',
      }),
      // 3. 同步到 n8n
      syncOrderEventToN8n('order.created', {
        order_id,
        status: 'pending',
        customer_name,
        phone,
        email: email || null,
        pickup_time,
        delivery_method: delivery_method || 'pickup',
        delivery_address: delivery_address || null,
        total_price: originalPriceValue,
        final_price: finalPriceValue,
        promo_code: promo_code || null,
        discount_amount: discountAmountValue,
        items: items as OrderItem[],
      }),
    ]).catch((error) => {
      console.error('通知發送錯誤（不影響訂單）:', error);
    });

    return NextResponse.json({
      success: true,
      order_id,
      message: '訂單建立成功！我們已收到您的預訂。',
    });
  } catch (error) {
    console.error('API 錯誤 - 建立訂單:', error);

    const message =
      error instanceof Error
        ? error.message
        : (error as any)?.message || '建立訂單失敗，請稍後再試';

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
