# CURRENT.md — shop.kiwimu.com

## Snapshot · 2026-07-10

Status: `P0+P1+宅配標示技術層完成；production schema 已套，待真實內容補齊與分支整合/部署`

拍板結果（Penso 2026-07-10）：做 P0（商品頁＋欄位）＋P1（信任頁＋footer）＋P2 僅宅配標示；blog／節慶 landing／通路但書本輪不做。

本輪完成：
- `/product/[idOrSlug]` 商品詳情頁、Product JSON-LD、購物車操作、固定但書、列表「查看詳情」與宅配標示。
- `menu_items` 新增 12 個 nullable 內容欄位；admin 可編輯、清空並驗證 slug／日期／URL／預購天數。
- `/faq`、`/shipping`、`/refund`、`/location`、`/terms`、`/privacy` 與全站共用 Footer；sitemap/robots 同步。
- 修正 root Suspense 導致的商品 soft-404；不存在商品現回真正 HTTP 404 + noindex。
- Supabase migration 歷史的 8 位舊版本撞名已正規化為唯一版本；`20260710000001_product_content_fields.sql` 已套 production 並以 anon select 驗回 12 欄。

驗證：
- `npx tsc --noEmit --incremental false --pretty false` ✅
- `npm run lint` ✅ 0 error（11 個既有 warning）
- `NEXT_TELEMETRY_DISABLED=1 npm run build` ✅（51 routes）
- `npm run verify:analytics-seo -- --profile=local-build` ✅ 11/11
- production-mode local smoke：6 個信任頁、首頁、登入、商品頁、sitemap 皆 200；未知商品 404；桌面/行動瀏覽器無水平溢出、console 0 error/warning。
- 最終 diff 未另派 fresh-context agent 獨立簽收；以上為 Codex 機械與瀏覽器驗證。

部署 Gate：
- 成分／過敏原／保存方式需 Penso 依每品項提供真實資料；資料為空時商品頁不顯示該區塊。
- 宅配範圍、退換貨、客製規則、隱私權與服務條款仍有【待補】；未完成前不可把本分支部署為 production 信任內容。
- 本輪未部署 Vercel、未切 LINE Pay 公開狀態。

---

（前輪）Status: `研究輪完成 — 內容/IA 升級藍圖已落檔，後續範圍已拍板並實作`

目標：參考 ponpie.tw 的內容結構與全站架構（非視覺風格），保持月島甜點既有設計邏輯，產出 shop 升級藍圖。
產出：`CONTENT_ARCHITECTURE_PLAN_2026-07-10.md`（差距總表＋P0-P3 分期＋5 個決策點＋機器可查驗收）。
研究結論摘要：ponpie = CyberBiz 企業版；shop 差距集中在內容層——無獨立商品詳情頁、成分/保存/配送/預購欄位全缺、FAQ/運送/退換貨/門市頁全缺、footer 僅首頁內嵌。ponpie 過敏原非結構化是其弱項＝shop 超車機會。
拍板：blog／節慶 landing／通路價差但書不做；P0+P1+宅配標示已進入上方 2026-07-10 交付狀態。

---

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
