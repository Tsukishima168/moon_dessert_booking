# n8n + Google Sheet 訂單總表串接

## 1. 專案環境變數

在 `.env.local`（或 Vercel Environment Variables）設定：

```bash
N8N_ORDER_WEBHOOK_URL=https://your-n8n-domain/webhook/moon-orders
N8N_ORDER_WEBHOOK_SECRET=replace-with-strong-secret
```

## 2. 系統會送出的事件

網站會自動送兩種事件到 n8n：

- `order.created`: 新訂單建立
- `order.status_updated`: 後台更新訂單狀態

HTTP Header：

- `Content-Type: application/json`
- `x-moon-signature: <hmac_sha256_hex>`（若有設定 `N8N_ORDER_WEBHOOK_SECRET`）

## 3. Payload 格式

```json
{
  "event_id": "uuid",
  "event_type": "order.created",
  "occurred_at": "2026-02-16T10:00:00.000Z",
  "source": "moonmoon-website",
  "order": {
    "order_id": "ORD1234567890",
    "status": "pending",
    "customer_name": "王小美",
    "phone": "0912345678",
    "email": "demo@example.com",
    "pickup_time": "2026-02-20 14:00",
    "delivery_method": "pickup",
    "delivery_address": null,
    "total_price": 880,
    "final_price": 800,
    "promo_code": "MOON80",
    "discount_amount": 80,
    "items": [
      { "name": "草莓塔", "variant_name": "6吋", "quantity": 1, "price": 800 }
    ]
  }
}
```

## 4. n8n 建議流程

1. Webhook Trigger（接收網站事件）
2. Function（驗證 `x-moon-signature`，可選）
3. Set（整理成 Google Sheet 欄位）
4. Google Sheets：
   - `order.created` 用 `Append Row`
   - `order.status_updated` 用 `Lookup + Update Row`（以 `order_id` 當主鍵）

## 5. Google Sheet 欄位建議

- `order_id`
- `event_type`
- `status`
- `customer_name`
- `phone`
- `pickup_time`
- `delivery_method`
- `total_price`
- `final_price`
- `promo_code`
- `discount_amount`
- `items_summary`（把品項組成一段字串）
- `occurred_at`
- `source`

## 6. 多來源整合建議

其他來源（LINE、電話、現場）也都先寫入同一張 Sheet，並使用相同 `order_id` 規則與 `status` 字典，讓現場與製作人員只看一份總表即可。
