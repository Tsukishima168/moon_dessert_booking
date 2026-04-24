import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPickupReminderEmail, sendPickupReminderLineNotify } from '@/lib/notifications';
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope';

// Vercel Cron 配置
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 取得明天的日期（台灣時區）
function getTomorrowDate(): string {
    const now = new Date();
    // 轉換為台灣時區
    const taiwanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    taiwanTime.setDate(taiwanTime.getDate() + 1);

    const year = taiwanTime.getFullYear();
    const month = String(taiwanTime.getMonth() + 1).padStart(2, '0');
    const day = String(taiwanTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// GET: 執行取貨提醒
export async function GET(request: Request) {
    try {
        // 驗證 Cron Secret（Vercel 自動帶 Authorization header）
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // CRON_SECRET 為必填，未設定時直接拒絕所有請求
        if (!cronSecret) {
            console.error('[cron] CRON_SECRET 未設定，拒絕所有請求');
            return NextResponse.json(
                { success: false, message: '服務未設定' },
                { status: 503 }
            );
        }
        if (authHeader !== `Bearer ${cronSecret}`) {
            console.warn('[cron] 未授權的請求');
            return NextResponse.json(
                { success: false, message: '未授權' },
                { status: 401 }
            );
        }

        const tomorrowDate = getTomorrowDate();
        console.log(`正在查詢 ${tomorrowDate} 的取貨訂單...`);

        const adminClient = createAdminClient();

        // 查詢明天取貨的訂單
        // pickup_time 欄位可能是 "2026-01-29" 或 "2026-01-29 14:00" 格式
        const { data: orders, error } = await adminClient
            .from('orders')
            .select('*')
            .eq('checkout_site', SHOP_CHECKOUT_SITE)
            .like('pickup_time', `${tomorrowDate}%`)
            .in('status', ['pending', 'confirmed', 'paid', 'preparing']);

        if (error) {
            console.error('查詢訂單錯誤:', error);
            return NextResponse.json(
                { success: false, message: '查詢訂單失敗', error: error.message },
                { status: 500 }
            );
        }

        if (!orders || orders.length === 0) {
            console.log('沒有明天取貨的訂單');
            return NextResponse.json({
                success: true,
                message: '沒有需要提醒的訂單',
                date: tomorrowDate,
                count: 0,
            });
        }

        console.log(`找到 ${orders.length} 筆明天取貨的訂單`);

        // 發送提醒
        const results = {
            total: orders.length,
            emailSent: 0,
            lineSent: 0,
            errors: [] as string[],
        };

        for (const order of orders) {
            try {
                // 發送 Email 提醒
                if (order.email) {
                    const emailSent = await sendPickupReminderEmail({
                        to: order.email,
                        customerName: order.customer_name,
                        orderId: order.order_id,
                        items: order.items || [],
                        totalPrice: order.final_price || order.total_price,
                        pickupTime: order.pickup_time,
                        deliveryMethod: order.delivery_method || 'pickup',
                        deliveryAddress: order.delivery_address,
                    });

                    if (emailSent) {
                        results.emailSent++;
                    }
                }

                // 發送 LINE Notify 給店家（提醒店家準備）
                const lineSent = await sendPickupReminderLineNotify({
                    orderId: order.order_id,
                    customerName: order.customer_name,
                    phone: order.phone,
                    pickupTime: order.pickup_time,
                    items: order.items || [],
                    deliveryMethod: order.delivery_method || 'pickup',
                });

                if (lineSent) {
                    results.lineSent++;
                }
            } catch (err) {
                const errorMsg = `訂單 ${order.order_id} 發送失敗: ${err}`;
                console.error(errorMsg);
                results.errors.push(errorMsg);
            }
        }

        console.log('取貨提醒完成:', results);

        return NextResponse.json({
            success: true,
            message: '取貨提醒發送完成',
            date: tomorrowDate,
            results,
        });
    } catch (error) {
        console.error('Cron 執行錯誤:', error);
        return NextResponse.json(
            { success: false, message: '執行失敗', error: String(error) },
            { status: 500 }
        );
    }
}
