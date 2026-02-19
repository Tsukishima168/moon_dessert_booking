# N8N 訂單自動化設定指南

本指南將協助您申請 N8N 帳號，並設定自動化流程，將 Next.js 系統的訂單同步寫入您現有的 Google Sheet「訂單資料庫」。

## 1. 申請 N8N 帳號

推薦使用官方 Cloud 版本（最簡單），或自行架設。

1. 前往 [n8n.cloud](https://n8n.cloud/) 註冊帳號。
2. 登入後，點擊右上角 **"Add workflow"** 建立新流程。

## 2. 設定 N8N Workflow

請依照以下節點順序建立流程：

### 節點 1: Webhook (Trigger)
- **Node Type:** `Webhook`
- **HTTP Method:** `POST`
- **Authentication:** `None` (我們會透過 Header 簽章驗證，或簡化起見先不驗證)
- **Respond:** `Immediately`
- **Path:** (自動產生，例如 `abcd-1234...`)
- **複製 URL:**
  - 點擊 "Production URL" 分頁
  - 複製該網址，這就是 `N8N_ORDER_WEBHOOK_URL`

### 節點 2: Google Sheets
- **Node Type:** `Google Sheets`
- **Operation:** `Append` (新增資料) 或 `Update` (更新資料)
  - 建議做兩個分支：
    - `order.created` -> `Append`
    - `order.status_updated` -> `Update` (需先透過 Lookup 找到行號)
- **Document:** 選擇您的試算表（ID: `1YgUKW-cJJSnYgvYihAqcNI0c7V3JxREfGpR5_5vse68`）
- **Sheet:** `訂單資料庫`

### 3. 欄位映射 (Mapping)

請將 Webhook 收到的 JSON 資料，對應到您的 Google Sheet 欄位。
根據您的 Google Apps Script (`doPost`) 邏輯，對應如下：

| Google Sheet 欄位 (Col) | 欄位名稱 (Header) | Webhook JSON 欄位對應 | 備註 |
|---|---|---|---|
| A (1) | (保留) | (留空) | |
| B (2) | 付款狀態 | `status` | 例如 `pending`, `paid` |
| C (3) | 來源 | `source` | 預設 `online` |
| D (4) | 取貨日期 | `pickup_time` | 需格式化為日期 |
| E (5) | 姓名 | `customer_name` | |
| F (6) | 電話 | `phone` | 建議加上 `'` 前綴避免掉 0 |
| G (7) | 品項 | `items_summary` | 自 `lib/integrations/n8n.ts` 產生 |
| H (8) | 規格 | (留空或自訂) | 新系統將規格整合在品項敘述中 |
| I (9) | 數量 | `1` | 因品項已合併，此處可填 1 或總數 |
| J (10)| 蠟燭 | (無) | 新系統暫無此欄位 |
| K (11)| 折扣 | `discount_amount` | |
| L (12)| 方式／時段 | `delivery_method` | `pickup` 或 `delivery` |
| M (13)| 價格 | `final_price` | |
| N (14)| 聯絡窗口 | (無) | |
| O (15)| 附註 | (無) | |
| P (16)| 收件人姓名 | `delivery_address` | (若為宅配) |
| Q (17)| 收件人電話 | `phone` | (若為宅配) |
| R (18)| 宅配地址 | `delivery_address` | |
| S (19)| UUID | `order_id` | **關鍵欄位**，用於對帳與更新 |

## 4. 環境變數設定

回到 Vercel 或 `.env.local`，填入從步驟 2 取得的 URL：

```env
N8N_ORDER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/...
N8N_ORDER_WEBHOOK_SECRET=your_secret_password
```

## 5. 常見問題 (FAQ)

**Q: 舊的 GAS `doPost` 還需要嗎？**
A: 新的網站系統不走 GAS `doPost`，而是直接寫入 Supabase DB，並同時發送 Webhook 給 N8N。
GAS 的 `doPost` 可保留給舊系統或備用。

**Q: `items_summary` 是什麼？**
A: 因為 Google Sheet 設計為「一列一單」，但新系統允許「一單多品項」。
為了相容，我們在程式中將多個品項合併成一段文字，例如：「草莓塔(6吋) x1 / 巴斯克(切片) x2」，直接填入「品項」欄位。
