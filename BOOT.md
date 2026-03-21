# BOOT.md — Moon Dessert Booking · 冷啟動快照

> 每次新開 Claude 對話，先讀這份文件。

---

## 冷啟動快照 · 2026-03-21 收工

### 今日完成（人工測試 bug 批量修復）

Codex 遺留 49 個 dirty 檔案後，本輪完成診斷 + 修復：

**Commit `7148da6`** — WIP snapshot（Codex 遺留的 49 個未 commit 檔案）

**Commit `0ffcc19`** — P0/P1 核心修復
- `order.service.ts`：移除 anon client `validatePromoCode`，改用 `validatePromoCodeServer`（admin client）→ 修正優惠碼在 API route 失效
- `order.service.ts`：`recalculateOrderPricing` 加 `menu_variants` 容錯 fallback → 修正前端無法下單、會卡住
- `auth/login/page.tsx`：Google OAuth / magic link redirect 預設從 `'/'` 改 `'/account'` → 修正登入後看不到 /account
- `auth/callback/page.tsx`：fallback 改 `'/account'`
- `checkout/page.tsx`：profile 自動帶入加 `user.user_metadata.full_name` fallback → 修正只帶入 email
- TS 0 errors（email.handler 型別、order-status stub、searchParams null safety）

**Commit `8469334`** — Admin / 主題修復
- `admin/page.tsx` handleLogout：改呼叫 `DELETE /api/admin/auth`，不再碰 `supabase.auth.signOut()` → 修正 admin 登出清掉用戶 Supabase session
- `api/admin/auth/route.ts`：新增 DELETE endpoint 清除 admin_token cookie
- Navbar logo + globals.css：淺色模式白色 logo 自動 `filter: brightness(0)` 變黑

### 待人工驗證（重啟 dev server 後逐一測）

1. **Google 登入** → 應跳到 `/account`，不是首頁
2. **結帳頁** → 姓名應從 Google user_metadata 帶入（若 profiles 表無資料）
3. **優惠碼** → 先在 Supabase 建一筆測試優惠碼 → 結帳套用 → 確認折扣即時更新
4. **Banners 表** → 進 Supabase Dashboard，確認 `banners` 表是否有資料；若空，手動新增一筆 `is_active=true` → 確認前後台顯示
5. **Admin 登出** → 點登出後 kk4e18 的 Supabase session 應不受影響，仍可進 /account
6. **主題切換** → 切淺色 → 重新整理 → 應保留淺色
7. **淺色模式 logo** → 應自動變黑色

### 待主理人執行

1. **PR merge 順序（功能通過後）：**
   - PR #11：`feat/linepay → main`（含本輪所有修復）
   - PR #10：`feat/shop-security-and-completeness → main`（SSO）

2. **Vercel 環境變數（LINE Pay 憑證取得後）：**
   | 變數 | 值 |
   |------|------|
   | `LINEPAY_CHANNEL_ID` | （申請後填入） |
   | `LINEPAY_CHANNEL_SECRET` | （申請後填入） |
   | `LINEPAY_API_URL` | `https://sandbox-api-pay.line.me`（先 sandbox）|
   | `NEXT_PUBLIC_SITE_URL` | `https://shop.kiwimu.com` |

3. **Supabase Auth → URL Configuration：**
   新增 Redirect URL：`https://passport.kiwimu.com/**`

4. **GA4 手動標記 Key Events：**
   - `begin_checkout` / `add_to_cart` / `purchase` / `linepay_confirm`

### 待確認（未解鎖）
- n8n 部署位置（本機 or 雲端？）→ 決定後才能測試訂單自動化
- ManyChat LINE 連接
- passport GPS 真人驗證（需到店內）

---

## 分支狀態

| 分支 | 狀態 | 說明 |
|------|------|------|
| `main` | ✅ Production | 穩定版，LINE Bank 轉帳 |
| `feat/linepay` | ⏳ PR #11 待 merge | LINE Pay + 本輪 bug 修復（local head: `8469334`）|
| `feat/shop-security-and-completeness` | ⏳ 待 merge | SSO Phase 1-4 |
| `feat/resend-email` | ✅ 已 merge | Resend Email |
| `refactor/soc-phase1` | ✅ 已 merge | 三層架構 |

---

## 核心架構

```
Next.js App Router (Vercel)
├── app/
│   ├── account/         ← 會員工作台（重寫後：profile 編輯 + 訂單列表 + 積分）
│   ├── admin/           ← 後台管理（admin_token cookie auth，獨立於 Supabase session）
│   │   ├── orders/      ← 訂單管理 + 編輯 + CSV 匯出
│   │   ├── menu/        ← 菜單管理（拖曳排序）
│   │   ├── banners/     ← Banner 管理
│   │   └── promo-codes/ ← 優惠碼 CRUD
│   ├── checkout/        ← 結帳（auth → profile 自動帶入 → 優惠碼 → 建立訂單）
│   ├── order/
│   │   ├── success/     ← LINE Pay 付款成功頁
│   │   ├── error/       ← LINE Pay 付款失敗頁
│   │   └── cancel/      ← LINE Pay 用戶取消頁
│   └── api/
│       ├── order/       ← POST 建立訂單（server-side 重算 + 優惠碼驗證）
│       ├── admin/       ← 後台 CRUD API（ensureAdmin 守門）
│       ├── user/        ← profile / orders / points（需 Supabase session）
│       └── payment/
│           └── linepay/ ← LINE Pay v3（request / confirm）
├── lib/
│   ├── supabase.ts          ← browser client（anon key，給前端）
│   ├── supabase-server.ts   ← SSR client（cookie，給 Server Components / API routes）
│   └── supabase-admin.ts    ← admin client（service_role，給後台操作）
└── src/services/
    └── order.service.ts     ← 訂單完整業務邏輯（重算 + 優惠碼 + EventBus）
```

## 外部整合

| 服務 | 狀態 | 說明 |
|------|------|------|
| **Supabase** | ✅ | 訂單、菜單、Banner、行銷、profiles |
| **Vercel** | ✅ | 生產部署 |
| **Resend** | ✅ | noreply@kiwimu.com 郵件通知 |
| **Discord Webhook** | ✅ | #dessert-booking 頻道通知 |
| **N8N** | ⚠️ 待確認 | 部署位置未定 |
| **LINE Pay** | ⏳ PR #11 | Channel ID/Secret 取得後上線 |
| **GA4** | ✅ 埋點完成 | Key Events 待手動標記 |
