import { createHmac, randomUUID } from 'crypto';

export type OrderSyncEventType = 'order.created' | 'order.status_updated';

interface SyncOrderItem {
  id?: string;
  name: string;
  variant_name?: string;
  quantity: number;
  price: number;
}

export interface OrderSyncPayload {
  order_id: string;
  status: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  pickup_time: string;
  delivery_method?: string;
  delivery_address?: string | null;
  total_price: number;
  final_price?: number;
  promo_code?: string | null;
  discount_amount?: number;
  items: SyncOrderItem[];
  source?: string;
  updated_at?: string;
}

// --- Retry 配置 ---
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 3000, 9000]; // 指數退避
const REQUEST_TIMEOUT_MS = 10_000; // 10 秒超時

function buildSignature(rawBody: string, secret: string) {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * 產生 items_summary 字串（供 Google Sheet 使用）
 * 例：「草莓塔(6吋) x1 / 巴斯克(切片) x2」
 */
export function buildItemsSummary(items: SyncOrderItem[]): string {
  return items
    .map((item) => {
      const variant = item.variant_name ? `(${item.variant_name})` : '';
      return `${item.name}${variant} x${item.quantity}`;
    })
    .join(' / ');
}

/**
 * Dead-letter 日誌：webhook 最終失敗時記錄完整資訊
 * 後續可對接 DB、Sheet 分頁、或外部通知
 */
function logDeadLetter(
  eventType: OrderSyncEventType,
  payload: OrderSyncPayload,
  error: unknown,
  attempts: number
) {
  const deadLetter = {
    timestamp: new Date().toISOString(),
    event_type: eventType,
    order_id: payload.order_id,
    attempts,
    error: error instanceof Error ? error.message : String(error),
    payload_snapshot: {
      status: payload.status,
      customer_name: payload.customer_name,
      phone: payload.phone,
      total_price: payload.total_price,
      items_summary: buildItemsSummary(payload.items),
    },
  };

  console.error(
    '[n8n] ❌ DEAD LETTER — webhook 最終失敗，需人工處理:',
    JSON.stringify(deadLetter, null, 2)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncOrderEventToN8n(
  eventType: OrderSyncEventType,
  payload: OrderSyncPayload
): Promise<boolean> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_ORDER_WEBHOOK_URL || process.env.N8N_ORDER_WEBHOOK_URL;
  const webhookSecret = process.env.NEXT_PUBLIC_N8N_ORDER_WEBHOOK_SECRET || process.env.N8N_ORDER_WEBHOOK_SECRET || '';

  // 未設定 URL 則靜默跳過（不算失敗）
  if (!webhookUrl) return false;

  const body = JSON.stringify({
    event_id: randomUUID(),
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    source: payload.source || 'moonmoon-website',
    order: {
      ...payload,
      items_summary: buildItemsSummary(payload.items),
    },
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (webhookSecret) {
    headers['x-moon-signature'] = buildSignature(body, webhookSecret);
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 超時控制
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        if (attempt > 0) {
          console.log(`[n8n] ✅ webhook 成功（第 ${attempt + 1} 次嘗試）`);
        }
        return true;
      }

      // 非 2xx — 伺服器錯誤才重試，4xx 不重試
      lastError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );

      if (response.status >= 400 && response.status < 500) {
        console.error(
          `[n8n] webhook 4xx 錯誤（不重試）:`,
          response.status,
          response.statusText
        );
        break; // 客戶端錯誤，不重試
      }

      console.warn(
        `[n8n] webhook 第 ${attempt + 1} 次失敗:`,
        response.status,
        response.statusText
      );
    } catch (error) {
      lastError = error;
      const isAbort =
        error instanceof Error && error.name === 'AbortError';
      console.warn(
        `[n8n] webhook 第 ${attempt + 1} 次${isAbort ? '超時' : '異常'}:`,
        error instanceof Error ? error.message : error
      );
    }

    // 等待後重試（最後一次不等）
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS_MS[attempt] || 9000;
      await sleep(delay);
    }
  }

  // 所有重試都失敗 — 寫入 dead-letter
  logDeadLetter(eventType, payload, lastError, MAX_RETRIES + 1);
  return false;
}
