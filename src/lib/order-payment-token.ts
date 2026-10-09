import { createHash, createHmac, timingSafeEqual } from 'crypto'

export const ORDER_PAYMENT_TOKEN_TTL_S = 24 * 60 * 60

export function orderPaymentCookieName(orderId: string): string {
  return `shop_payment_${createHash('sha256').update(orderId).digest('hex').slice(0, 32)}`
}

// Separate purpose from receipt tokens, using the existing server-only signing key.
function signature(orderId: string, expires: number, secret: string): string {
  return createHmac('sha256', secret).update(`shop-payment.${orderId}.${expires}`).digest('hex')
}

export function generateOrderPaymentToken(orderId: string): string | null {
  const secret = process.env.ORDER_SUCCESS_TOKEN_SECRET
  if (!secret?.trim()) return null
  const expires = Date.now() + ORDER_PAYMENT_TOKEN_TTL_S * 1000
  return `${expires}.${signature(orderId, expires, secret)}`
}

export function verifyOrderPaymentToken(orderId: string, token?: string): boolean {
  const secret = process.env.ORDER_SUCCESS_TOKEN_SECRET
  if (!secret?.trim() || !token || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false
  const [rawExpires, signed] = token.split('.')
  const expires = Number(rawExpires)
  if (!Number.isSafeInteger(expires) || expires <= Date.now()) return false
  return timingSafeEqual(Buffer.from(signed, 'hex'), Buffer.from(signature(orderId, expires, secret), 'hex'))
}
