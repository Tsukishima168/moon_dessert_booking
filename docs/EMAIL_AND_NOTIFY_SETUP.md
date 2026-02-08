# 📧 Email 寄信 + 通知設定指南

> **更新：** LINE Notify 已於 2025/3/31 停止服務，本專案已改為使用 Discord 作為訂單通知。

---

## 一、LINE Notify 停止服務後的替代方案

### 目前專案狀態

- **訂單通知（店家）**：已改為使用 **Discord Webhook**，不再依賴 LINE Notify
- **客戶 Email**：使用 **Resend** 寄送訂單確認信

### 若你還沒設定 Discord

1. 建立 Discord 伺服器（或使用既有伺服器）
2. 建立一個「通知用」的頻道
3. 頻道設定 → 整合 → Webhook → 新增 Webhook
4. 複製 Webhook URL
5. 在 Vercel 環境變數加上：
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
   ```
6. 重新部署

### 其他替代選項（未來可擴充）

| 方案 | 說明 | 難度 |
|------|------|------|
| **Discord Webhook** | 目前採用，免費、設定簡單 | ✅ 已實作 |
| **Telegram Bot** | 類似 LINE，可推播到手機 | 中等 |
| **LINE Messaging API** | 官方替代方案，需 LINE 官方帳號 | 較高 |
| **Email 轉寄** | 訂單通知也寄到你的 Gmail | 簡單 |

---

## 二、Resend + 自訂網域寄信（一步步設定）

### 前置：你需要的東西

- 一個網域（例如：`moondessert.tw`）
- 網域的 DNS 管理權限（在 GoDaddy、Cloudflare、Gandi 等購買或管理）

---

### 步驟 1：註冊 Resend 並取得 API Key

1. 前往 [resend.com](https://resend.com) 註冊
2. 登入後 → **API Keys** → **Create API Key**
3. 複製產生的 Key（開頭是 `re_`）
4. 貼到 Vercel 環境變數：
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   ```

---

### 步驟 2：在 Resend 新增你的網域

1. Resend Dashboard → **Domains** → **Add Domain**
2. 輸入你的網域，例如：`moondessert.tw`
   - **建議用子網域**：例如 `mail.moondessert.tw` 或 `orders.moondessert.tw`
   - 好處：不影響主網域、寄信信譽隔離
3. 按 **Add**

---

### 步驟 3：取得 Resend 給你的 DNS 紀錄

Resend 會顯示你需要新增的 DNS 紀錄，大致有兩種：

#### A. SPF 紀錄（TXT）

- **主機名稱**：`send` 或 `send.moondessert.tw`（Resend 會明確顯示）
- **類型**：TXT
- **數值**：類似  
  `v=spf1 include:amazonses.com ~all`

#### B. DKIM 紀錄（TXT）

- **主機名稱**：Resend 會給一組，例如 `resend._domainkey`
- **類型**：TXT
- **數值**：一長串字元（Resend 會直接顯示）

---

### 步驟 4：到你的 DNS 管理後台新增紀錄

**常見 DNS 後台**（依你購買網域的地方）：

| 購買/管理平台 | 進入方式 |
|---------------|----------|
| **Cloudflare** | 網域 → DNS → Records → Add record |
| **GoDaddy** | 我的產品 → DNS 管理 |
| **Namecheap** | Domain List → Manage → Advanced DNS |
| **Gandi** | 網域 → DNS 紀錄 |
| **Google Domains** | 網域 → DNS |

**操作方式**（以 Cloudflare 為例）：

1. 登入 Cloudflare → 選擇你的網域
2. 左側 **DNS** → **Records**
3. 點 **Add record**
4. 依 Resend 顯示的內容新增：
   - **Type**：TXT
   - **Name**：Resend 給的主機名稱（例如 `send` 或 `resend._domainkey.moondessert`）
   - **Content**：Resend 給的完整字串
   - **TTL**：Auto 或 3600
5. 儲存
6. SPF 和 DKIM 各一筆，都要新增

---

### 步驟 5：回到 Resend 驗證網域

1. 新增完 DNS 後，等待 **5–15 分鐘**（DNS 傳播需要時間）
2. 回到 Resend → Domains → 你的網域
3. 點 **Verify DNS Records**
4. 若成功，狀態會變成 **Verified**

---

### 步驟 6：設定寄件人 Email

1. Resend 驗證成功後，你就能用該網域寄信
2. 寄件人格式建議：`orders@moondessert.tw` 或 `noreply@mail.moondessert.tw`
3. 在 Vercel 環境變數設定：
   ```
   RESEND_FROM_EMAIL=orders@你的網域.com
   ```
4. 重新部署

---

## 三、常見問題

### Q1：Resend 建議用子網域，子網域要怎麼設？

- 在 DNS 新增一筆 **A 紀錄** 或 **CNAME** 指向 Resend（若 Resend 有要求）
- 實際上 Resend 主要需要的是 **TXT 紀錄**，通常只要在主網域下新增 `send`、`resend._domainkey` 等名稱即可
- 若你的網域是 `moondessert.tw`，Resend 可能要求：
  - `send.moondessert.tw` 的 TXT
  - 那在 DNS 裡新增 Name = `send` 即可（會自動變成 `send.moondessert.tw`）

### Q2：DNS 新增後 Resend 一直顯示未驗證？

- 等 10–15 分鐘再按驗證
- 確認 Name、Content 完全照 Resend 複製，沒有多餘空格
- 可用 [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) 查 `TXT` 紀錄是否已生效

### Q3：沒有自己的網域可以嗎？

- 可以先用 Resend 提供的測試網域：`onboarding@resend.dev`
- 但可能進垃圾信、每日額度較少
- 正式營運建議還是用自訂網域

### Q4：我的網域在 OOO 購買，怎麼找 DNS 設定？

- 登入你購買網域的平台（如 GoDaddy、Cloudflare）
- 找到「DNS 設定」「DNS 管理」「Nameservers」等選項
- 新增紀錄的方式大同小異：選擇類型（TXT）、輸入名稱、輸入內容、儲存

---

## 四、設定檢查清單

- [ ] Resend 帳號已註冊
- [ ] RESEND_API_KEY 已加到 Vercel 環境變數
- [ ] 在 Resend 新增網域
- [ ] 在 DNS 後台新增 SPF（TXT）
- [ ] 在 DNS 後台新增 DKIM（TXT）
- [ ] Resend 網域狀態為 Verified
- [ ] RESEND_FROM_EMAIL 已設定（例如 orders@你的網域.com）
- [ ] 已重新部署
- [ ] 實際下單測試，確認收到訂單確認信

---

## 五、通知方案總覽

| 用途 | 目前方案 | 環境變數 |
|------|----------|----------|
| 客戶訂單確認信 | Resend（自訂網域） | RESEND_API_KEY、RESEND_FROM_EMAIL |
| 店家新訂單通知 | Discord Webhook | DISCORD_WEBHOOK_URL |
| ~~LINE Notify~~ | 已停用 | 不需設定 |

---

需要協助某一步（例如 Cloudflare / GoDaddy 具體畫面），可以告訴我你用的是哪一家 DNS 服務，我可以寫成更精簡的圖文步驟。
