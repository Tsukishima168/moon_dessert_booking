import { notifyNewOrder, sendCustomerEmail } from '@/lib/notifications'
import type { OrderItem } from '@/lib/supabase'

type OrderCreatedPayload = {
  order?: {
    order_id: string
    customer_name: string
    phone: string
    email?: string | null
    items: Array<{
      id?: string
      name: string
      variant_name?: string
      quantity: number
      price: number
    }>
    total_price: number
    final_price?: number | null
    promo_code?: string | null
    discount_amount?: number | null
    original_price?: number | null
    payment_date?: string | null
    pickup_time: string
    delivery_method?: string | null
    delivery_address?: string | null
    delivery_fee?: number | null
    delivery_notes?: string | null
    source_from?: string | null
    utm_source?: string | null
  }
}

export async function handleOrderCreatedNotifications(
  payload: Record<string, unknown>
): Promise<void> {
  const order = (payload as OrderCreatedPayload).order

  if (!order) {
    console.warn('[OrderCreatedNotifications] order.created event missing order payload')
    return
  }

  const normalizedItems: OrderItem[] = (order.items || []).map((item, index) => ({
    id: item.id ?? `${order.order_id}-${index}`,
    name: item.name,
    variant_name: item.variant_name,
    quantity: item.quantity,
    price: item.price,
  }))

  const tasks: Promise<unknown>[] = [
    notifyNewOrder({
      orderId: order.order_id,
      customerName: order.customer_name,
      phone: order.phone,
      totalPrice: order.final_price ?? order.total_price,
      pickupTime: order.pickup_time,
      items: normalizedItems,
      promoCode: order.promo_code ?? undefined,
      discountAmount: order.discount_amount ?? undefined,
      originalPrice: order.original_price ?? undefined,
      paymentDate: order.payment_date ?? undefined,
      deliveryMethod: order.delivery_method === 'delivery' ? 'delivery' : 'pickup',
      deliveryAddress: order.delivery_address ?? undefined,
      deliveryFee: order.delivery_fee ?? undefined,
      deliveryNotes: order.delivery_notes ?? undefined,
      orderSource: order.source_from ?? undefined,
      utmSource: order.utm_source ?? undefined,
    }),
  ]

  if (order.email) {
    tasks.push(
      sendCustomerEmail({
        to: order.email,
        customerName: order.customer_name,
        orderId: order.order_id,
        items: normalizedItems,
        totalPrice: order.final_price ?? order.total_price,
        pickupTime: order.pickup_time,
        promoCode: order.promo_code ?? undefined,
        discountAmount: order.discount_amount ?? undefined,
        originalPrice: order.original_price ?? undefined,
        paymentDate: order.payment_date ?? undefined,
        deliveryMethod: order.delivery_method === 'delivery' ? 'delivery' : 'pickup',
        deliveryAddress: order.delivery_address ?? undefined,
        deliveryFee: order.delivery_fee ?? undefined,
        deliveryNotes: order.delivery_notes ?? undefined,
      })
    )
  }

  const results = await Promise.allSettled(tasks)

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[OrderCreatedNotifications] task #${index} failed for ${order.order_id}:`,
        result.reason
      )
    }
  })
}
