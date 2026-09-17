import { createHmac, timingSafeEqual } from 'crypto'

/**
 * /order/success 頁面的短時效簽章 token。
 *
 * 背景：該頁僅憑 URL 上的 orderId 查詢訂單（訂單編號、狀態、付款方式、金額、品項），
 * 訪客結帳流程無法要求登入，但沒有任何驗證代表任何人只要拿得到 order_id
 * （不論是用猜的、還是從 Discord 通知 / n8n / Email 等下游管道流出）就能看到別人的訂單。
 *
 * 解法：LINE Pay 付款確認成功後，導頁到 /order/success 時額外帶上一組
 * HMAC-SHA256 簽章 token（簽 order_id + 到期時間戳記），成功頁進頁時驗簽，
 * 驗不過就 fail-closed、不顯示訂單內容。
 *
 * 僅供 Server Component / Route Handler 使用（依賴 Node `crypto`），
 * 絕對不可被 'use client' 檔案引入。
 */

// 有效期 48 小時：涵蓋「結帳完當下看一次、隔天或後天想再確認取貨時間又點開同一個連結」
// 的常見情境，同時把可被利用的曝光窗口壓在 Penso 建議的 24–72 小時區間中點，不拉到上限。
export const ORDER_SUCCESS_TOKEN_TTL_MS = 48 * 60 * 60 * 1000

function getSecret(): string | null {
  const secret = process.env.ORDER_SUCCESS_TOKEN_SECRET
  return secret && secret.trim().length > 0 ? secret : null
}

/** 密鑰是否已設定；供呼叫端決定要不要提前記 log 示警。 */
export function isOrderSuccessTokenSecretConfigured(): boolean {
  return getSecret() !== null
}

function sign(orderId: string, expiresAt: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${orderId}.${expiresAt}`)
    .digest('hex')
}

/**
 * 產生 /order/success 用的簽章 token。
 * 密鑰未設定時回傳 null（呼叫端應記 log 並讓導頁 URL 不帶 t 參數，
 * 成功頁那端會因為驗不到 token 而 fail-closed，行為一致、不會拋例外炸掉付款流程）。
 */
export function generateOrderSuccessToken(orderId: string): string | null {
  const secret = getSecret()
  if (!secret) {
    console.error(
      '[order-success-token] ORDER_SUCCESS_TOKEN_SECRET 未設定，無法產生 token（訂單:',
      orderId,
      '）— /order/success 將因缺少 token 而 fail-closed，請盡快在環境變數補上此密鑰。'
    )
    return null
  }

  const expiresAt = Date.now() + ORDER_SUCCESS_TOKEN_TTL_MS
  const signature = sign(orderId, expiresAt, secret)
  return `${expiresAt}.${signature}`
}

/** 依 generateOrderSuccessToken 產生的 token，組出完整導頁路徑。 */
export function buildOrderSuccessPath(orderId: string): string {
  const token = generateOrderSuccessToken(orderId)
  const params = new URLSearchParams({ orderId })
  if (token) {
    params.set('t', token)
  }
  return `/order/success?${params.toString()}`
}

export type OrderSuccessTokenVerification =
  | { valid: true }
  | {
      valid: false
      reason: 'missing_secret' | 'missing_token' | 'malformed' | 'expired' | 'signature_mismatch'
    }

/**
 * 驗證 /order/success 收到的 token 是否對應該 orderId、簽章正確且未過期。
 * 任何一步驗不過都回傳 valid: false（fail-closed），呼叫端不應顯示訂單內容。
 */
export function verifyOrderSuccessToken(
  orderId: string,
  token: string | null | undefined
): OrderSuccessTokenVerification {
  const secret = getSecret()
  if (!secret) {
    console.error(
      '[order-success-token] ORDER_SUCCESS_TOKEN_SECRET 未設定，無法驗證 token（訂單:',
      orderId,
      '）— fail-closed，本次請求不會顯示訂單內容。'
    )
    return { valid: false, reason: 'missing_secret' }
  }

  if (!token) {
    return { valid: false, reason: 'missing_token' }
  }

  const separatorIndex = token.indexOf('.')
  if (separatorIndex <= 0) {
    return { valid: false, reason: 'malformed' }
  }

  const expiresAtRaw = token.slice(0, separatorIndex)
  const signature = token.slice(separatorIndex + 1)
  const expiresAt = Number(expiresAtRaw)

  if (!Number.isFinite(expiresAt) || !/^[0-9a-f]{64}$/i.test(signature)) {
    return { valid: false, reason: 'malformed' }
  }

  const expectedSignature = sign(orderId, expiresAt, secret)
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const actualBuffer = Buffer.from(signature.toLowerCase(), 'hex')

  const signatureMatches =
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)

  if (!signatureMatches) {
    return { valid: false, reason: 'signature_mismatch' }
  }

  if (Date.now() > expiresAt) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true }
}
