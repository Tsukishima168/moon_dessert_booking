# BOOT.md — Moon Dessert Booking · 冷啟動快照

> 每次新開 Claude 對話，先讀這份文件。

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
