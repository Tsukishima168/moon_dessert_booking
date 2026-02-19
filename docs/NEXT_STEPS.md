# 訂單系統下一步執行指南

系統核心程式碼已修復並驗證完成（Build Passing ✅）。
接下來請依照以下步驟完成部署與自動化設定。

## 1. 系統部署（Deployment）

由於即使是本地測試也建議使用 HTTPS（LINE/N8N webhooks 通常要求），建議直接部署到 Vercel。

1. **Push Code:** 將最新程式碼推送到 GitHub。
2. **Vercel Deploy:** 在 Vercel 匯入專案，並設定環境變數（參考 `.env.local`）。
3. **取得網址:** 部署成功後，獲得 `https://your-project.vercel.app`。

## 2. N8N 自動化設定（選用但強烈建議）

若要啟用「訂單自動寫入 Google Sheet」功能：

1. **申請 N8N:** 可使用 [n8n.cloud](https://n8n.cloud/) 或自行架設。
2. **建立 Workflow:**
   - 新增 **Webhook** 節點（Method: POST）。
   - 取得 **Webhook URL**（Production URL）。
   - 設定 **Webhook Secret**（自訂一組長密碼，例如 `moon_secret_123`）。
3. **設定環境變數:**
   回到 Vercel 設定 -> Environment Variables，新增：
   - `N8N_ORDER_WEBHOOK_URL`: 填入 N8N Webhook URL
   - `N8N_ORDER_WEBHOOK_SECRET`: 填入剛設定的密碼

## 3. Google Sheet 設定

在 N8N 流程中，將資料寫入 Google Sheet。請建立一個新試算表，並設定以下欄位（Row 1）：

| A | B | C | D | E |
|---|---|---|---|---|
| `order_id` | `status` | `customer_name` | `phone` | `items_summary` |

| F | G | H | I | J |
|---|---|---|---|---|
| `total_price` | `pickup_time` | `delivery_method` | `created_at` | `updated_at` |

## 4. 錯誤通知（Discord）

為了避免漏單，當 N8N 同步失敗時，系統會發送通知。

1. **申請 Webhook:** 在 Discord 頻道 -> 編輯頻道 -> 整合 -> Webhook -> 新增 Webhook -> 複製 URL。
2. **設定環境變數:**
   - `DISCORD_WEBHOOK_URL`: 填入 Discord Webhook URL

---

### 常見問題

**Q: 我還沒申請 N8N，網站能用嗎？**
A: **可以！** 網站核心功能（下單、後台管理）完全獨立運作。N8N 未設定時，系統會自動略過同步，不會報錯。

**Q: 為什麼本地端測試失敗？**
A: 之前的錯誤是 `node_modules` 損壞導致的，與 N8N 無關。我們已執行 Clean Install 修復，現在 `npm start` 可正常啟動。
