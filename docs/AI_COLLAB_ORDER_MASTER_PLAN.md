# 訂單總表協作文件（給多個 AI 平台交叉處理）

## 目標

建立一份「單一真實來源」的訂單總表（Google Sheet），整合：

- 網站下單（本專案）
- 非網站來源（LINE / 電話 / 現場）
- 訂單狀態更新（製作流程）

核心原則：現場與製作人員只看同一張總表，不分來源。

---

## 專案目前已完成（本專案程式端）

### 1) n8n Webhook 同步模組

- 檔案：`lib/integrations/n8n.ts`
- 功能：
  - 送出事件：`order.created`、`order.status_updated`
  - Header 支援：`x-moon-signature`（HMAC-SHA256）
  - 可透過環境變數開關：未設定 URL 則不送

### 2) 新訂單事件同步

- 檔案：`app/api/order/route.ts`
- 當網站建立訂單成功後，會非阻塞送 webhook 到 n8n：
  - 事件：`order.created`
  - 內容：訂單主資料 + 商品明細

### 3) 狀態更新事件同步

- 檔案：`app/api/admin/orders/[orderId]/route.ts`
- 後台更新狀態後會送 webhook：
  - 事件：`order.status_updated`
  - 內容：最新訂單資料
- 已有狀態白名單：
  - `pending`, `paid`, `preparing`, `ready`, `completed`, `cancelled`

### 4) 文件與環境變數

- 環境變數範例：`.env.local.example`
  - `N8N_ORDER_WEBHOOK_URL`
  - `N8N_ORDER_WEBHOOK_SECRET`
- 串接文件：`docs/N8N_ORDER_SYNC.md`

---

## 統一事件格式（Canonical Event）

```json
{
  "event_id": "uuid",
  "event_type": "order.created | order.status_updated",
  "occurred_at": "ISO-8601",
  "source": "moonmoon-website",
  "order": {
    "order_id": "ORDxxxx",
    "status": "pending",
    "customer_name": "姓名",
    "phone": "手機",
    "email": "email@example.com",
    "pickup_time": "2026-02-20 14:00",
    "delivery_method": "pickup | delivery",
    "delivery_address": "地址或 null",
    "total_price": 1000,
    "final_price": 900,
    "promo_code": "折扣碼或 null",
    "discount_amount": 100,
    "items": [
      { "name": "草莓塔", "variant_name": "6吋", "quantity": 1, "price": 900 }
    ],
    "updated_at": "ISO-8601"
  }
}
```

---

## Google Sheet 欄位規格（建議）

建議工作表：`order_master`

欄位：

- `order_id`（主鍵）
- `event_type`
- `status`
- `source`
- `customer_name`
- `phone`
- `email`
- `pickup_time`
- `delivery_method`
- `delivery_address`
- `total_price`
- `final_price`
- `promo_code`
- `discount_amount`
- `items_summary`
- `occurred_at`
- `updated_at`
- `last_synced_at`

`items_summary` 建議格式：

`草莓塔(6吋) x1 / 巴斯克(切片) x2`

---

## n8n Workflow 邏輯（建議）

1. `Webhook Trigger`  
   接收網站事件 JSON。

2. `Function`（可選但建議）  
   驗證 `x-moon-signature` 與 payload body。

3. `Set / Function`  
   轉成 Sheet 欄位格式，並生成 `items_summary`。

4. `IF`（依 `event_type` 分流）
   - `order.created`：Google Sheets `Append Row`
   - `order.status_updated`：Google Sheets `Lookup` by `order_id` + `Update Row`

5. `Error Branch`  
   失敗通知（Discord/Slack/Email）避免漏單。

---

## 多 AI 分工建議

### Track A：n8n 工作流實作

- 輸出：
  - 可匯入的 workflow JSON
  - 簽章驗證 Function code
  - Append/Update 流程

### Track B：Google Sheet 資料治理

- 輸出：
  - 表頭與格式（日期/數字/驗證規則）
  - 條件格式（即將取貨、已逾時、取消單）
  - 每日生產清單 view（可用 Query 工作表）

### Track C：非網站來源接入

- 輸出：
  - LINE/電話/現場資料映射到 canonical schema
  - `order_id` 生成規則
  - 去重策略（同手機 + 同時間窗 + 同金額）

### Track D：可觀測性與補償

- 輸出：
  - webhook 失敗重試機制
  - dead-letter queue 策略（至少以 Sheet 分頁或 DB 暫存）
  - 每日對帳報表（網站訂單數 vs 總表筆數）

---

## 可以直接丟給其他 AI 的任務提示（Prompt）

### Prompt 1：n8n Workflow 生成

請為 n8n 產生一份可 import 的 workflow JSON。  
需求：

- 入口為 Webhook（POST JSON）
- 驗證 header `x-moon-signature`（HMAC-SHA256）
- 解析事件 `order.created` / `order.status_updated`
- 寫入 Google Sheet `order_master`
  - `order.created` -> append row
  - `order.status_updated` -> lookup `order_id` 後 update row
- 發生錯誤時送 Discord 通知（含 event_id、order_id、error）

### Prompt 2：Google Sheet 結構優化

請設計 Google Sheet 訂單總表，輸出：

- 表頭欄位與資料型別
- 欄位公式（items_summary、狀態顏色、待處理標記）
- 兩個視圖：
  - 當日製作清單（依 pickup_time）
  - 待處理訂單（status in pending/paid/preparing）

### Prompt 3：多來源資料對齊

請設計「LINE/電話/現場」來源映射到以下 canonical schema：  
`order_id, status, customer_name, phone, pickup_time, delivery_method, total_price, items[]`  
並提供：

- 去重規則
- 缺欄位補值策略
- 與網站來源衝突時的優先權規則

---

## 驗收標準（Definition of Done）

- 新網站訂單在 10 秒內出現在 `order_master`
- 後台拖拉狀態後，對應列狀態正確更新
- n8n 流程錯誤時有通知，不會靜默失敗
- 非網站來源可用同一 schema 寫入並被現場使用
- 每日可輸出「當日製作清單」供現場執行

---

## 目前已知限制

- 本專案目前僅完成「網站來源」事件推送；非網站來源接入待實作。
- 本地工具鏈 lint/tsc 在本次執行環境有卡住情況，建議在 CI 或本機再跑一次完整檢查。
