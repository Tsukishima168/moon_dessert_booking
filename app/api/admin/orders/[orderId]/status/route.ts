import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendOrderStatusNotification } from '@/lib/notifications';
import { syncOrderEventToN8n } from '@/lib/integrations/n8n';
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin';

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

        // 發送狀態變更通知（非同步，不阻塞回應）
        sendOrderStatusNotification({
            orderId: order.order_id,
            customerName: order.customer_name,
            phone: order.phone,
            email: order.email,
            oldStatus,
            newStatus: status,
            pickupTime: order.pickup_time,
            deliveryMethod: order.delivery_method || 'pickup',
            items: Array.isArray(order.items) ? order.items : [],
        }).catch((err) => {
            console.error('發送狀態通知錯誤（不影響更新）:', err);
        });

        // 同步到 n8n（非同步，不阻塞回應）
        void syncOrderEventToN8n('order.status_updated', {
            order_id: order.order_id,
            status,
            customer_name: order.customer_name,
            phone: order.phone,
            email: order.email,
            pickup_time: order.pickup_time,
            delivery_method: order.delivery_method,
            delivery_address: order.delivery_address,
            total_price: order.total_price,
            final_price: order.final_price,
            promo_code: order.promo_code,
            discount_amount: order.discount_amount,
            items: Array.isArray(order.items) ? order.items : [],
            updated_at: new Date().toISOString(),
        });

        console.log(`訂單 ${orderId} 狀態更新: ${oldStatus} → ${status}`);

        return NextResponse.json({
            success: true,
            message: `訂單狀態已更新為 ${status}`,
            data: { orderId, oldStatus, newStatus: status },
        });
    } catch (error) {
        console.error('更新訂單狀態錯誤:', error);
        return NextResponse.json(
            { success: false, message: '更新狀態失敗' },
            { status: 500 }
        );
    }
}
