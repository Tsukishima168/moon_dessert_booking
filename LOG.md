# LOG.md — shop.kiwimu.com

## 2026-06-04

- 啟動五站長期穩定營運策略 Phase 0，先處理 Shop 收入核心。
- 清理本機未追蹤重複檔：
  - `components/checkout/purchase-tracker 2.tsx`
  - 已用 `cmp` 確認與 `components/checkout/purchase-tracker.tsx` 完全相同後刪除。
- 新增 LINE Pay feature flag / 營運狀態：
  - `hidden`：客人不可見，API 拒絕新付款 request。
  - `internal_test`：一般客人不可見；同瀏覽器有 admin session 時可測。
  - `public`：正式公開，客人可見且可 request。
- 修改前台 checkout：
  - 改由 `/api/payment/linepay/status` 判斷是否顯示 LINE Pay。
  - 未開放時不顯示 LINE Pay 按鈕。
- 修改 LINE Pay request API：
  - 若憑證未設定仍回 `503`。
  - 若狀態未允許則回 `403`。
  - confirm route 未加公開狀態 gate，避免既有交易付款後無法回調確認。
- 後台設定新增 LINE Pay 公開狀態選項。
- 新增 `VERIFY.md` 作為 Shop 固定驗證清單。
- 待驗證：
  - 已完成 lint / typecheck / build。
  - 已完成 local guard smoke。
  - 真人 LINE Pay E2E。
- 驗證結果：
  - `npm run lint` pass；維持既有 13 warnings。
  - `npx tsc --noEmit --pretty false` pass。
  - `npm run build` pass。
  - local production server `http://127.0.0.1:4140/` 回 200。
  - local `/api/payment/linepay/status` 回 `configured=true`、`enabled=true`、`status=hidden`、`can_use_line_pay=false`。
  - local `/api/payment/linepay/request` 在 hidden 狀態下回 403。
  - local fallback `LINEPAY_PUBLIC_STATUS=public` 時，status 回 `public` / `can_use_line_pay=true`，缺 `orderId` request 回 400。
  - Chrome headless checkout smoke：pending order 訂單成立畫面可顯示、銀行轉帳資訊存在、LINE Pay 按鈕數量 0、page error 0。
- Build 補充：
  - 移除 `pages/_document.tsx`。該檔是 App Router 專案中的 Pages Router 殘留，功能已由 `app/layout.tsx` 提供；保留會讓 Next 15 build 偶發進入 `pages-manifest.json` 路徑。

## 2026-05-11

- 封測前修復已寫回 SSOT：
  - `BOOT.md`：新增 2026-05-11 冷啟動快照，記錄付款、LINE Pay、會員訂單、後台安全、migrations、驗證結果與待部署事項。
  - `docs/2026-04-08-supabase-architecture.md`：更新 Supabase SSOT，補 `admin_auth_attempts`、`notification_logs`、admin session hash、audit/notification RLS 狀態與 2026-05-11 migrations。
- 已驗證：
  - `npx tsc --noEmit`
  - `npm run lint`（0 errors；14 existing warnings）
  - `npm run build`
  - `npm audit --omit=dev --audit-level=high`
  - `localhost:3020` smoke：`/checkout`、`/account`、`/api/settings`、`/api/check-menu-availability`
- 待確認：使用者回報「checkout 右邊出現了 ...」句子未完整，需要補充右側實際出現的內容或截圖。

## 2026-04-01

- 僅做交付推進，不重整 SSOT、不搬 repo、不改 remote、不碰 production。
- 驗證 `npm run build` 通過。
- 補上 `export const dynamic = 'force-dynamic'` 到以下 user API routes：
  - `app/api/user/orders/route.ts`
  - `app/api/user/orders/[orderId]/route.ts`
  - `app/api/user/points/route.ts`
  - `app/api/user/profile/route.ts`
- 重跑 build 通過，build 期間不再出現 cookie-based user API 的 dynamic usage 訊息。
- 驗證本機啟動：
  - `npm run start -- -p 3101`
  - `/`、`/checkout`、`/auth/login` 皆回 `HTTP 200`
- 建立 `CURRENT.md` / `LOG.md` 作為交付狀態入口。
- 未解 blocker 保留在真人驗證與外部憑證層：`LINE Pay`、`Resend`、`Discord`、`n8n`、登入後流程。
