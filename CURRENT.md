# CURRENT.md — shop.kiwimu.com

## Snapshot · 2026-06-05

Status: `Shop 數據與 SEO 量測已收斂；production 仍待部署最新 build`

本輪完成：
- GA4 Shop 事件統一走 `lib/shop-analytics.ts`。
- `add_to_cart` / `begin_checkout` / `purchase` 都會帶 `site_id=shop` 與 attribution / UTM context。
- 首頁 attribution 的 `landing_url` 改存 scrub 前原始入口 URL。
- 新增 `npm run verify:analytics-seo`，可分 `local-build` / `production` profile 驗證。

已完成驗證：
- `npx tsc --noEmit --pretty false`
- `npm run lint`（0 errors；既有 13 warnings）
- `rm -rf .next && npm run build`
- `npm run verify:analytics-seo -- --profile=local-build`（11 passed / 0 failed）

Production 觀察：
- `npm run verify:analytics-seo -- --profile=production` 目前 12 passed / 3 failed。
- 失敗項為首頁 canonical、Bakery JSON-LD、robots query URL block。
- local build 已產出這些項目，因此 production 問題屬於尚未部署最新 build，而不是本機 source 缺漏。
- 本輪未執行 production deploy；付款公開狀態未更動。

下一步 gate：
- 若要修正 production SEO 差距，需要部署 Shop 最新 build 後再跑 production profile。
- LINE Pay 仍維持公告前 internal test / hidden 策略，不應長時間切 `public`。

---

## Snapshot · 2026-06-04

Status: `production 可測；LINE Pay 進入 feature-flag 營運控制`

已完成驗證與收斂：
- `main` 已與 `origin/main` 對齊於 `f51f61c fix(admin): align menu marketing writes with schema`
- production `https://shop.kiwimu.com/` 可回應
- production `/api/menu` 可回應
- Vercel Production 已設定 `LINEPAY_CHANNEL_ID`、`LINEPAY_CHANNEL_SECRET`、`LINEPAY_API_URL`
- LINE Pay request / confirm API 已部署
- 新增 LINE Pay 公開狀態：`hidden` / `internal_test` / `public`
- 未公告時，LINE Pay 可維持 `hidden` 或 `internal_test`，避免一般客人在訂單成立後看到付款入口
- `VERIFY.md` 已新增 Shop 固定驗證清單

目前 Blockers / 待真人驗證：
1. LINE Pay 正式小額或 sandbox 真人 E2E 尚未完成：request → LINE Pay → confirm → `/order/success`
2. 外部整合仍需真人觀察：Resend、Discord、n8n、GA4 key events
3. LINE Pay 對外公告前，後台 `line_pay_status` 不應長時間設為 `public`

下一步 gate：
- 後台確認 `payment_settings.line_pay_status` 為 `hidden` 或 `internal_test`
- 用同一瀏覽器 admin session 跑一筆內部 LINE Pay 測試訂單
- 通過後再決定公告與切 `public`

---

## Snapshot · 2026-04-01

Status: `可驗證交付候選`

已完成驗證：
- `npm run build` 通過
- `npm run start -- -p 3101` 可啟動
- `curl -I http://127.0.0.1:3101/` → `200 OK`
- `curl -I http://127.0.0.1:3101/checkout` → `200 OK`
- `curl -I http://127.0.0.1:3101/auth/login` → `200 OK`
- `app/api/user/*` 已明確標記為 dynamic，build 不再出現 cookie-based route 的靜態判定噪音

## 目前 Blockers

1. `LINE Pay` 憑證未就位，無法做 request/confirm 端到端付款驗證。
2. 需要真人帳號驗證的流程尚未走完：`/account`、`/api/user/*`、admin gated flows。
3. 外部整合尚未做真人驗證：`Resend`、`Discord webhook`、`n8n webhook`、`GA4 key events`。
4. worktree 內有既存變動：`.claude/launch.json` 顯示為刪除，這次未處理。

## 最小交付清單

- 本機 build/start/smoke 可重現：已完成
- 首頁/結帳/登入頁可回應：已完成
- 非 LINE Pay 的下單路徑可完成一次本機驗證：待完成
- admin 基本操作（登入、訂單、菜單）可完成一次 smoke：待完成
- 外部通知與付款回調有真人驗證紀錄：待完成
- `CURRENT.md` / `LOG.md` 已建立：已完成

## 今晚可以直接做的項目

- 用測試帳號走一次購物車 → checkout → submit（先走非 LINE Pay 路徑）
- 做一次 admin login / orders / menu smoke
- 若 webhook 憑證可用，驗證下單後的 email / Discord / n8n 出站
- 補一份簡短截圖或錄影證據，作為交付附件

## 需要真人參與的驗證項目

- `LINE Pay` sandbox 或正式 request/confirm/cancel 流程
- 實際收件匣收到訂單信
- 實際 Discord 頻道收到通知
- 手機端或 LINE 內建瀏覽器完成 checkout 與登入驗證
