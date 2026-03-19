# BOOT.md — Moon Dessert Booking · 冷啟動快照

> 每次新開 Claude 對話，先讀這份文件。

---

## 冷啟動快照 · 2026-03-19 收工

### 今日完成
- LINE Pay 完整付款流程（feat/linepay → PR #11，等 Pen merge）
  - `/api/payment/linepay/request`：發起付款，取得 paymentUrl
  - `/api/payment/linepay/confirm`：LINE Pay 回調，確認付款 → 更新訂單
  - `/order/success` `/order/error` `/order/cancel`：三個結果頁
  - `checkout/page.tsx`：訂單成立後顯示 LINE Pay 主按鈕，LINE Bank 轉帳為備用
  - 修正 `setConfirmedName` / `setConfirmedAmount` 長期未被呼叫的 bug
- Supabase migration 已執行（API 直接寫入）：
  - `orders.linepay_transaction_id TEXT` ✅
  - `orders.payment_date TIMESTAMPTZ` ✅
- SSO Phase 1-4 migration 已執行（2026-03-18）

### 待主理人執行

1. **GitHub PR merge（照順序）：**
   - PR #11：`feat/linepay → main`（今天的 LINE Pay）
   - `feat/shop-security-and-completeness → main`（SSO）
   - passport PR #4：`fix/google-oauth-pkce-flow → main`（urgent）

2. **Vercel 環境變數（等明天 LINE Pay 憑證）：**
   | 變數 | 值 |
   |------|------|
   | `LINEPAY_CHANNEL_ID` | （申請後填入） |
   | `LINEPAY_CHANNEL_SECRET` | （申請後填入） |
   | `LINEPAY_API_URL` | `https://sandbox-api-pay.line.me`（先測試）|
   | `NEXT_PUBLIC_SITE_URL` | `https://shop.kiwimu.com`（確認已設定）|

3. **Supabase Auth → URL Configuration：**
   新增 Redirect URL：`https://passport.kiwimu.com/**`

4. **GA4 手動標記 Key Events：**
   - `begin_checkout` / `add_to_cart` / `purchase` / `linepay_confirm`

5. **LINE Pay 上線流程（明天）：**
   - sandbox 跑通 → 切 `LINEPAY_API_URL` 為 `https://api-pay.line.me`

### 待確認（未解鎖）
- n8n 部署位置（本機 or 雲端？）→ 決定後才能測試訂單自動化
- ManyChat LINE 連接
- passport GPS 真人驗證（需到店內）
- 店員 `/redeem` 核銷 SOP

---

## 分支狀態

| 分支 | 狀態 | 說明 |
|------|------|------|
| `main` | ✅ Production | 穩定版，LINE Bank 轉帳付款 |
| `feat/linepay` | ⏳ PR #11 待 merge | LINE Pay 完整流程（今天完成）|
| `feat/shop-security-and-completeness` | ⏳ 待 merge | SSO Phase 1-4 + user events |
| `feat/resend-email` | ✅ 已 merge | Resend Email 串接 |
| `refactor/soc-phase1` | ✅ 已 merge | 三層架構重構 |

---

## 核心架構

```
Next.js App Router (Vercel)
├── app/
│   ├── admin/           ← 後台管理介面
│   │   ├── orders/      ← 訂單列表 + 編輯 + CSV 匯出
│   │   ├── menu/        ← 菜單管理（拖曳排序）
│   │   ├── campaigns/   ← 行銷活動 CRUD
│   │   └── marketing-automation/  ← 自動化規則 CRUD
│   ├── order/
│   │   ├── success/     ← LINE Pay 付款成功頁
│   │   ├── error/       ← LINE Pay 付款失敗頁
│   │   └── cancel/      ← LINE Pay 用戶取消頁
│   └── api/
│       ├── order/       ← POST 建立訂單
│       ├── admin/       ← 後台 CRUD API
│       └── payment/
│           └── linepay/ ← LINE Pay v3（request / confirm）
├── lib/
│   ├── linepay.ts       ← LINE Pay v3 client + HMAC-SHA256
│   ├── supabase.ts      ← Supabase browser client
│   ├── supabase-server.ts
│   └── supabase-admin.ts
└── src/services/
    └── order.service.ts ← 訂單業務邏輯
```

## 外部整合

| 服務 | 狀態 | 說明 |
|------|------|------|
| **Supabase** | ✅ | 訂單、菜單、Banner、行銷資料 |
| **Vercel** | ✅ | 生產部署，環境變數已設定 |
| **Resend** | ✅ | noreply@kiwimu.com 郵件通知 |
| **Discord Webhook** | ✅ | #dessert-booking 頻道通知 |
| **N8N** | ⚠️ 待確認 | 本機 or 雲端部署未定 |
| **LINE Pay** | ⏳ PR #11 待 merge | 明天填入 Channel ID/Secret 後上線 |
| **GA4** | ✅ 埋點完成 | Key Events 待手動標記 |
