import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin';
import { runOrderStatusSideEffects } from '@/src/services/order-status-side-effects.service';

// PATCH /api/admin/orders/[orderId]/status - 更新訂單狀態
export async function PATCH(
    request: NextRequest,
    { params }: { params: { orderId: string } }
) {
    try {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = params;
        const { status } = await request.json();

        // 驗證狀態值
        const validStatuses = ['pending', 'paid', 'ready', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { success: false, message: '無效的狀態值' },
                { status: 400 }
            );
        }

        const adminClient = createAdminClient();

        // 先取得訂單資料（用於發送通知 + n8n 同步）
        const { data: order, error: fetchError } = await adminClient
            .from('orders')
            .select('*')
            .eq('order_id', orderId)
            .single();

        if (fetchError || !order) {
            return NextResponse.json(
                { success: false, message: '找不到訂單' },
                { status: 404 }
            );
        }

        const oldStatus = order.status;

        if (oldStatus === status) {
            return NextResponse.json({
                success: true,
                message: `訂單狀態維持為 ${status}，未重送通知`,
                data: { orderId, oldStatus, newStatus: status, skipped: true },
                notification_result: {
                    triggerMode: 'status_change',
                    requestedChannel: 'all',
                    statusChanged: false,
                    previousStatus: oldStatus,
                    currentStatus: status,
                    channels: {
                        discord: { state: 'skipped', message: '本次未變更狀態，不會重送 Discord 通知' },
                        email: { state: 'skipped', message: '本次未變更狀態，不會重送客戶 Email' },
                        n8n: { state: 'skipped', message: '本次未變更狀態，不會同步 n8n' },
                    },
                },
            });
        }

        // 更新狀態
        const { error: updateError } = await adminClient
            .from('orders')
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq('order_id', orderId);

        if (updateError) {
            throw updateError;
        }

        const notificationResult = await runOrderStatusSideEffects({
            orderId: order.order_id,
            customerName: order.customer_name,
            phone: order.phone,
            email: order.email,
            pickupTime: order.pickup_time,
            deliveryMethod: order.delivery_method,
            deliveryAddress: order.delivery_address,
            totalPrice: order.total_price,
            finalPrice: order.final_price,
            promoCode: order.promo_code,
            discountAmount: order.discount_amount,
            items: Array.isArray(order.items) ? order.items : [],
            updatedAt: new Date().toISOString(),
            previousStatus: oldStatus,
            currentStatus: status,
        });

        console.log(`訂單 ${orderId} 狀態更新: ${oldStatus} → ${status}`);

        return NextResponse.json({
            success: true,
            message: `訂單狀態已更新為 ${status}`,
            data: { orderId, oldStatus, newStatus: status },
            notification_result: notificationResult,
        });
    } catch (error) {
        console.error('更新訂單狀態錯誤:', error);
        return NextResponse.json(
            { success: false, message: '更新狀態失敗' },
            { status: 500 }
        );
    }
}
