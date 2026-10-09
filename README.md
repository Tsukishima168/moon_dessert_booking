# 🌙 MOON MOON - 月島甜點訂購系統

---

## 冷啟動快照 · 2026-03-10

### 當前狀態
- GA4 埋點：已部署
- Resend：已串接（noreply@kiwimu.com）
- SOC 三層：完成
- LINE Pay：架構待建，等 Channel ID

### 分支狀態
- main：production
- feat/mbti-v2：進行中
- feat/admin-polish：進行中

### 環境變數清單
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- RESEND_FROM_NAME
- LINE_NOTIFY_TOKEN
- BANK_NAME
- BANK_CODE
- BANK_BRANCH
- BANK_ACCOUNT
- ACCOUNT_HOLDER
- STORE_NAME
- STORE_PHONE
- STORE_LINE_ID
- ADMIN_PASSWORD
- ADMIN_EMAILS
- N8N_ORDER_WEBHOOK_URL
- N8N_ORDER_WEBHOOK_SECRET
- DISCORD_WEBHOOK_URL
- NEXT_PUBLIC_LIFF_ID
- NEXT_PUBLIC_GA4_ID
- LINEPAY_CHANNEL_ID
- LINEPAY_CHANNEL_SECRET
- LINEPAY_API_URL
- NEXT_PUBLIC_SITE_URL
極簡高級風格的甜點預訂系統，使用 Next.js 14 + Supabase + Email + LINE 通知。

---

## 🚀 快速開始

### **👉 從這裡開始** → [docs/START_HERE.md](./docs/START_HERE.md)

只需 5 分鐘！

---

## ✨ 功能特點

- 🖤 **極簡設計** - 深色系、方形元素、藝術館風格
- 📋 **Supabase 整合** - 支援多規格商品（例如：大杯、小杯）
- 🛒 **購物車系統** - Zustand 狀態管理 + LocalStorage
- 📝 **表單驗證** - React Hook Form
- 📧 **Email 通知** - 自動寄送訂單確認給客戶（Resend）
- 📱 **LINE 通知** - 新訂單即時通知店家（LINE Notify）
- 🎨 **響應式設計** - 手機/平板/桌面完美支援

---

## 🛠 技術棧

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **通知**: LINE Notify
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Form**: React Hook Form
- **Icons**: Lucide React
- **Language**: TypeScript

---

## 📁 專案結構

```
Dessert-Booking/
├── 📂 app/                    # Next.js App Router
│   ├── api/                  # API 路由
│   ├── checkout/             # 結帳頁面
│   └── page.tsx              # 首頁
├── 📂 components/             # React 組件
├── 📂 lib/                    # 工具函式
├── 📂 store/                  # Zustand Store
├── 📂 docs/                   # 📚 文件
│   ├── START_HERE.md         # ⭐ 快速開始
│   ├── SIMPLE_SETUP.md       # 詳細設定
│   ├── DESIGN_NOTES.md       # 設計說明
│   └── PROJECT_SUMMARY.md    # 專案總結
├── 📂 scripts/                # 資料庫腳本
│   └── SUPABASE_SETUP.sql    # 建立 orders 資料表
└── package.json
```

---

## 🎨 設計風格

### Moon Moon 美學
- 🖤 **深色系**（黑色背景 #0A0A0A）
- ⬜ **方形設計**（無圓角）
- 📏 **細邊框**（取代陰影）
- ✨ **極簡優雅**

參考來源：[Moon Moon 月島甜點](https://map.kiwimu.com)

完整設計指南：[docs/DESIGN_NOTES.md](./docs/DESIGN_NOTES.md)

---

## 📚 文件導覽

| 文件 | 說明 |
|------|------|
| **[docs/START_HERE.md](./docs/START_HERE.md)** | ⭐ 最快啟動（5 分鐘）|
| [docs/SIMPLE_SETUP.md](./docs/SIMPLE_SETUP.md) | 詳細設定步驟 |
| [docs/DESIGN_NOTES.md](./docs/DESIGN_NOTES.md) | 設計規範與風格 |
| [docs/PROJECT_SUMMARY.md](./docs/PROJECT_SUMMARY.md) | 專案架構總覽 |
| [scripts/SUPABASE_SETUP.sql](./scripts/SUPABASE_SETUP.sql) | 資料庫設定 |

---

## ⚡ 快速指令

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build

# 啟動生產伺服器
npm start
```

---

## 🔧 環境變數

複製 `.env.local.example` 為 `.env.local` 並填入：

```env
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx

# Email（選填）
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# LINE 通知（選填）
LINE_NOTIFY_TOKEN=

# LINE Pay（選填；未設定 API URL 時預設 sandbox）
LINEPAY_CHANNEL_ID=
LINEPAY_CHANNEL_SECRET=
# LINEPAY_API_URL=https://sandbox-api-pay.line.me
# LINEPAY_PUBLIC_STATUS=hidden
# NEXT_PUBLIC_SITE_URL=https://shop.kiwimu.com

# 匯款資訊（必填）
BANK_NAME=連線商業銀行
BANK_CODE=824
BANK_BRANCH=總行 6880
BANK_ACCOUNT=111007479473
ACCOUNT_HOLDER=您的名字

# 店家資訊
STORE_NAME=MOON MOON
STORE_PHONE=
STORE_LINE_ID=
```

詳細說明：[docs/START_HERE.md](./docs/START_HERE.md)

---

## 📊 資料結構

### Supabase 資料表

1. **menu_items** - 商品主資料（您已有）
2. **menu_variants** - 商品規格與價格（您已有）
3. **orders** - 訂單資料（需建立）

執行 [scripts/SUPABASE_SETUP.sql](./scripts/SUPABASE_SETUP.sql) 建立訂單資料表。

---

## 🚀 部署

### Vercel（推薦）

1. 推送到 GitHub
2. 在 [Vercel](https://vercel.com) 匯入專案
3. 設定環境變數
4. 部署完成！

---

## 🎯 使用流程

```
客戶瀏覽商品
    ↓
選擇規格 + 加入購物車
    ↓
填寫資訊（姓名、手機、Email、取貨時間）
    ↓
送出訂單
    ↓
系統自動：
    ├─ 儲存到 Supabase
    ├─ 寄 Email 給客戶（含匯款帳號）
    └─ 發 LINE 通知給店家
```

---

## 💰 成本

全部免費（在免費額度內）：

- ✅ Supabase: 500MB + 50K 請求/月
- ✅ Resend: 100 封/天（3,000 封/月）
- ✅ LINE Notify: 完全免費
- ✅ Vercel: 免費部署

---

## 📝 授權

MIT License

---

## 🌙 關於 MOON MOON

**MOON MOON 月島甜點**  
台南安南區療癒系甜點

[官網導覽](https://map.kiwimu.com)

---

**Designed with 🖤 in 2024**

---

## Phase 1 Gate (Current)
**Goal: Validate traffic funnel**

### Metrics
- MBTI completions: 1000
- Orders: 200
- AOV: NT
- Monthly revenue: NTk

## Shop 安全修補的部署順序（2026-10-09）

- 回歸：`node scripts/test-shop-security.mjs`、`node scripts/test-resend-results.mjs`、`node scripts/test-logout-result.mjs`、`npx tsc --noEmit`、`npm run lint`、`npm run build`。安全測試只使用模擬依賴，不建立訂單、不付款、不寄信。
- 行銷寄送預設暫停（一般訂單通知不受此開關影響）。完成正式資料庫 `20261009000000_restrict_campaigns_access.sql` migration、確認 anon／authenticated 的表與欄位權限已收回、核對既有活動內容後，才能設定伺服器端 `SHOP_MARKETING_SEND_ENABLED=true`。本 PR 只提供 migration 來源，沒有套用到正式資料庫；不能把上線程式當作權限修復完成。
- 訪客付款需要下單時簽發的 HttpOnly cookie，有效期 24 小時且只送到付款 request 路徑，沿用 `ORDER_SUCCESS_TOKEN_SECRET`。已登入會員可透過訂單 `user_id` 驗證本人。簽章設定缺漏、舊匿名訂單或過期憑證會拒絕付款入口；請聯繫店家確認原訂單，不能只憑訂單編號補發憑證或要求重新下單。
- 所有後台寫入與登入同步必須帶精確同源的 Origin；本機與 preview 比對實際請求網址。後台 FormData 上傳仍可用。外部工具不能直接重放 cookie 請求。
- Email 模板中的變數只可出現在一般文字節點，不能放入 HTML 標籤、屬性、URL、script、style 或其他原始文字區塊；不符合的自訂模板會拒絕寄送，需店家修正。靜態 HTML 排版保留。
- 優惠碼只在 DB 明確拒絕建單時釋放一次。寫入或回滾回應不明時保留額度待核對，避免把可能成立的訂單視為失敗。付款日期改由伺服器付款確認設定，忽略客戶自行填入的時間。
- 未簽收：iPhone Safari／LINE 內建瀏覽器、Passport／OAuth 真人登入、正式 DB 權限及 Email 模板、LINE Pay 並行確認／取消競態。既有 exposed credentials 輪替與 Next 升級也不包含在本 PR；不得宣稱全面安全通過。
- 回滾：還原本 PR 的程式 commit，但保持行銷寄送停用。不要恢復 campaigns 的公開權限，不要合併既有 Shop #26 來替代本次修補。
