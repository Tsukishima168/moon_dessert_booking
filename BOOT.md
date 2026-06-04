# BOOT.md — Moon Dessert Booking · 冷啟動快照

> 每次新開 Claude 對話，先讀這份文件。

---

## 冷啟動快照 · 2026-05-11

### 本輪完成

**shop 封測前修復 + 子代理 reviews 收斂**

1. **付款 / 結帳 P0 修復**
   - `/api/order` 現在回傳後端重算後的 `final_price` / `finalPrice`。
   - `/checkout` 成功頁、LINE 轉帳訊息、GA4 purchase、LINE Pay request 都改用後端回傳金額，避免前端購物車折扣/運費與 DB 最終金額不一致。
   - `/checkout` 送出前會呼叫 `/api/check-menu-availability` 預檢每個菜單品項；後端仍保留 fail-closed 驗證。
   - pending order localStorage 加上 24h TTL，成功頁新增「建立新訂單」可清掉舊待付款快照。
   - 日期格子改用 `reservation_rules.max_advance_days` 截止，不再固定顯示 `minDays + 29`。

2. **LINE Pay 修復**
   - `lib/linepay.ts` 改用 raw text parser，將 LINE Pay `transactionId` 保留為 string，避免超過 JS safe integer 後失真。
   - LINE Pay request payload 改成單一「訂單總額」商品，確保 package amount 與 products sum 永遠一致。
   - `getPublicSiteUrl()` 由 `src/lib/site-url.ts` 統一處理；production 必須設定 `NEXT_PUBLIC_SITE_URL`，避免從可偽造 forwarded host 推導 confirm/cancel URL。
   - LINE Pay confirm 成功後走 `runOrderStatusSideEffects()`，補上通知 / n8n / notification log 一致性。

3. **會員 / 訂單紀錄**
   - 會員中心 `/account` 訂購紀錄已存在，可看到自己的訂單。
   - 訂單時間顯示不再用 `new Date("YYYY-MM-DD 12:00-13:00")`，避免 timezone / invalid date 問題。
   - user API routes 已限制 `checkout_site` 範圍，會員只看允許顯示的站點訂單。

4. **後台 / 安全**
   - 後台側欄 production 已顯示營運工具與站點成效入口。
   - admin auth rate limiter 改用 IP + UA hash identity；DB limiter 錯誤時 fail-closed 60 秒。
   - admin session token 入庫前改成 SHA-256 hash，cookie 保留原 token。
   - Discord webhook 設定改用 URL parser + host/path/protocol 驗證，只允許 Discord webhook URL；audit log 使用 service role client。
   - middleware 對 `/admin`、`/api/admin`、`/api/user` 補 `Cache-Control: no-store`。

5. **Supabase migrations**
   - `20260510000000_add_missing_availability_rpcs.sql`
     - 新增 `public.check_menu_item_availability`
     - 新增 `public.get_available_dates`
   - `20260511000001_harden_admin_log_rls.sql`
     - `audit_logs` / `notification_logs` 啟用 RLS
     - revoke anon/authenticated access
     - 僅 service role 透過 server API 讀寫

6. **依賴與文件清理**
   - `shadcn` 移到 devDependencies；`npm audit --omit=dev --audit-level=high` 為 0 vulnerabilities。
   - `.env.local.example` 補 LINE Pay、`NEXT_PUBLIC_SITE_URL`、`PUBLIC_SITE_HOST_ALLOWLIST`、admin auth limiter 設定。
   - 文件中的弱密碼 / 類似真實 API key 範例已替換為 placeholder。

### 驗證結果

- `npx tsc --noEmit` ✅
- `npm run lint` ✅ 0 errors；仍有 14 個既有 warnings（hook deps / `<img>`）
- `npm run build` ✅
- `npm audit --omit=dev --audit-level=high` ✅ 0 vulnerabilities
- 本機 smoke（`localhost:3020`）：
  - `/checkout` ✅ HTTP 200
  - `/account` ✅ HTTP 200
  - `/api/settings` ✅ 回傳 reservation rules
  - `/api/check-menu-availability?date=2026-05-15` ✅ 回傳 available

### 待部署 / 待真人驗證

1. **Supabase production 必須套 migration**
   - `supabase/migrations/20260510000000_add_missing_availability_rpcs.sql`
   - `supabase/migrations/20260511000001_harden_admin_log_rls.sql`

2. **Vercel production env 必填**
   | 變數 | 值 |
   |------|------|
   | `LINEPAY_CHANNEL_ID` | LINE Pay 後台取得 |
   | `LINEPAY_CHANNEL_SECRET` | LINE Pay 後台取得 |
   | `LINEPAY_API_URL` | sandbox: `https://sandbox-api-pay.line.me`；正式: `https://api-pay.line.me` |
   | `LINEPAY_PUBLIC_STATUS` | fallback 公開狀態；預設 `hidden`，可用 `internal_test` / `public` |
   | `NEXT_PUBLIC_SITE_URL` | `https://shop.kiwimu.com` |
   | `PUBLIC_SITE_HOST_ALLOWLIST` | `shop.kiwimu.com` |

3. **仍需真人 / 外部服務封測**
   - LINE Pay sandbox / 正式小額實付流程：先於後台設為 `internal_test` 或短暫 `public`，再跑 request → LINE Pay → confirm → `/order/success`
   - Resend 正式寄信
   - Discord webhook 正式頻道
   - n8n webhook 部署位置與實際觸發
   - Passport SSO 登入後於 shop 會員中心看訂單

### 待確認

- 使用者回報：「checkout 右邊出現了 ...」句子未完整。下次需確認右側出現的是錯誤訊息、空白、橫向 overflow、還是 Codex/browser UI 狀態。

---

## 冷啟動快照 · 2026-03-22

### 本輪完成

**全面診斷 + P0 安全修復（雙 AI 交叉驗證）**

1. **工作樹清理**
   - `git stash` 隔離 17 個 dirty changes（stash msg: `2026-03-22 dirty changes - 17 modified files, pre-cleanup`）
   - 刪除 3 個垃圾副本檔（`page 2.tsx`、`globals 2.css`、`Navbar 2.tsx`）
   - 回到 `04242ec` 乾淨基底，`tsc --noEmit` 0 errors、`next build` 通過

2. **P0 安全修復（2 commits）**
   - `2ce1920` fix: trust db amount for line pay request
     - LINE Pay request 改為只信任 DB 金額，前端 amount 不一致 → 400
     - 已付款訂單拒絕重複發起 → 409
     - items 改從 DB order.items 取，不信任前端
   - `c6232ff` fix: restrict n8n config to server env
     - 移除 `NEXT_PUBLIC_N8N_*` fallback，webhook URL/secret 只從 server env 讀取

3. **驗證結果**
   - `/api/send-email` 在乾淨基底已有 `INTERNAL_API_SECRET` header 驗證（非 open relay）
   - `next build` 通過
   - 工作樹乾淨（no uncommitted changes）

### 已 push

`main` HEAD: `c6232ff`，共 13 commits 已推上 `origin/main`。

### Stash 內容（待決定）

`git stash list` 第一筆包含 17 個改動，內含：
- 移除 LINE Pay 欄位（`linepay_transaction_id`）
- 停用 email/notification event handlers
- Repository 方法 stub 成 `TODO: implement`
- TypeScript errors（searchParams null safety + updated_at）

**判定：不建議直接 pop，應視為廢棄或逐項 cherry-pick 有用部分。**

### 下一步（P2 安全強化）

| 優先序 | 項目 | 說明 |
|--------|------|------|
| P2-1 | `ensureAdmin()` timing-safe 比對 | `app/api/admin/_utils/ensureAdmin.ts` 改用 `crypto.timingSafeEqual` |
| P2-2 | `check-menu-availability` fail-closed | 錯誤時回 `available: false`，不再 fail-open |
| P2-3 | `/api/order` items 結構驗證 | 驗證每個 item 的 name/quantity/price 型別 |
| P2-4 | 價格重算 fail-closed | DB 查詢失敗時拒絕訂單（503），不降級用前端價格 |
| P2-5 | admin debug 頁清理 | 移除 token 顯示邏輯 |
| P2-6 | 測試腳本殘留清理 | `check_supabase_orders.js`、`test-availability.ts` |

### 待主理人執行（未變）

1. **Vercel 環境變數（LINE Pay 憑證取得後）：**
   | 變數 | 值 |
   |------|------|
   | `LINEPAY_CHANNEL_ID` | （申請後填入） |
   | `LINEPAY_CHANNEL_SECRET` | （申請後填入） |
   | `LINEPAY_API_URL` | `https://sandbox-api-pay.line.me`（先 sandbox）|
   | `NEXT_PUBLIC_SITE_URL` | `https://shop.kiwimu.com` |

2. **GA4 手動標記 Key Events：**
   - `begin_checkout` / `add_to_cart` / `purchase` / `linepay_confirm`

### 待確認（未解鎖）
- n8n 部署位置（本機 or 雲端？）→ 決定後才能測試訂單自動化
- ManyChat LINE 連接
- passport GPS 真人驗證（需到店內）
- `feat/shop-security-and-completeness` 分支是否還需要

---

## 分支狀態

| 分支 | 狀態 | 說明 |
|------|------|------|
| `main` | ✅ Production | HEAD: `c6232ff`（P0 修復完成） |
| `feat/linepay` | ✅ 已合併 | 可刪除 |
| `feat/shop-security-and-completeness` | ⚠️ 待確認 | SSO Phase 1-4，與 main 有重疊 |
| `feat/resend-email` | ✅ 已 merge | Resend Email |
| `refactor/soc-phase1` | ✅ 已 merge | 三層架構 |

---

## 核心架構

```
Next.js App Router (Vercel)
├── app/
│   ├── account/         ← 會員工作台（Tabs：總覽 + 訂單 + profile 編輯 + 積分）
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
| **N8N** | ⚠️ 待確認 | 部署位置未定；env 已改為 server-only |
| **LINE Pay** | ⏳ 架構完成 | Channel ID/Secret 取得後上線；金額驗證已修 |
| **GA4** | ✅ 埋點完成 | Key Events 待手動標記 |
