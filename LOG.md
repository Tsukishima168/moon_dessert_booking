# LOG.md — shop.kiwimu.com

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
