# LOG.md — shop.kiwimu.com

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

