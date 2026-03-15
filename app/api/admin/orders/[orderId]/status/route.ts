import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin';
import {
    OrderNotFoundError,
    updateAdminOrderWithStatusEffects,
} from '@/src/services/order-status-transition.service';
import { syncOrderEventToN8n } from '@/lib/integrations/n8n';
import { EventBus } from '@/src/lib/event-bus';

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

        const { previousOrder, updatedOrder, notificationResult } =
            await updateAdminOrderWithStatusEffects(orderId, { status });

        const oldStatus = previousOrder.status;
        const skipped = oldStatus === updatedOrder.status;

        // 透過 EventBus 派發（email 通知由對應 handler 接收）
        if (!skipped) {
            void EventBus.emit('order.status_updated', {
                order: updatedOrder,
                oldStatus,
                newStatus: status,
                deliveryMethod: updatedOrder.delivery_method || 'pickup',
                items: Array.isArray(updatedOrder.items) ? updatedOrder.items : [],
            });
        }

        // 同步到 n8n
        void syncOrderEventToN8n('order.status_updated', {
            order_id: updatedOrder.order_id,
            status,
            customer_name: updatedOrder.customer_name,
            phone: updatedOrder.phone,
            email: updatedOrder.email,
            pickup_time: updatedOrder.pickup_time,
            delivery_method: updatedOrder.delivery_method,
            delivery_address: updatedOrder.delivery_address,
            total_price: updatedOrder.total_price,
            final_price: updatedOrder.final_price,
            promo_code: updatedOrder.promo_code,
            discount_amount: updatedOrder.discount_amount,
            items: Array.isArray(updatedOrder.items) ? updatedOrder.items : [],
            updated_at: updatedOrder.updated_at ?? new Date().toISOString(),
        });

        console.log(`訂單 ${orderId} 狀態更新: ${oldStatus} → ${status}`);

        return NextResponse.json({
            success: true,
            message: skipped
                ? `訂單狀態維持為 ${status}，未重送通知`
                : `訂單狀態已更新為 ${status}`,
            data: { orderId, oldStatus, newStatus: updatedOrder.status, skipped },
            notification_result: notificationResult,
        });
    } catch (error) {
        if (error instanceof OrderNotFoundError) {
            return NextResponse.json(
                { success: false, message: '找不到訂單' },
                { status: 404 }
            );
        }
        console.error('更新訂單狀態錯誤:', error);
        return NextResponse.json(
            { success: false, message: '更新狀態失敗' },
            { status: 500 }
        );
    }
}
