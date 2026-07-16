# CURRENT.md — shop.kiwimu.com

## Snapshot · 2026-07-16

Status: `Economy v2 foundation 已完成本機實作與原生 PostgreSQL 驗證；production schema 未變更，待 staging 與獨立簽收`

- 五站視覺發布已完成；Shop PR #16 已合併並通過 production smoke，先前「尚未 deploy」快照已由本段取代。
- Supabase CLI 已重新確認 linked target `xlqwfaailjyvsycjnzkz` 為 `ACTIVE_HEALTHY`；既有 35 個 local／remote migration 版本一致，`20260715000000`～`20260715000005` 僅存在本機、尚未 push。
- Economy v2 foundation 已建立 server-authoritative ledger、rollout config、事件政策、pending claim、Gacha server RNG、原子兌換／庫存、Supabase Auth staff 核銷、短效 Map proof、徽章／印章與 reconciliation views；所有 rollout flag 預設關閉，未匯入舊餘額或庫存。
- Shop 完成訂單回饋由資料庫直接驗證 `orders.user_id`、`status=completed` 與 `final_price`，依每完整 NT$100 一點計算，沒有舊制最低 10 點；取消／退款支援整筆及可冪等的精確部分 reversal。
- `npm run test:economy-v2` 已通過 migration apply、100 次冪等重送、偽造點數／事件、UTC 時區繞過、RLS／grants／search path、Gacha、Map proof、兌換／重複核銷、整筆與部分 reversal、100 路扣點及 20 路最後一件庫存競態。
- 2026-07-16 production linked dry-run 僅列出上述 6 個 migration，未包含 roles、seed 或未知版本；這是無寫入候選驗證，正式 push 前仍須再跑一次。
- Supabase preview branch `economy-v2-staging` 因目前方案不含 Branching（HTTP 402）無法建立；本機 PostgreSQL 不取代 Supabase staging。`db lint`、真實 Supabase RLS／PostgREST 整合與 fresh-context 獨立簽收仍是 merge／正式 migration 的硬 gate。
- 本輪未執行 production `db push`、未開 rollout flag、未改五站 client authority、未匯入 identified／anonymous／localStorage 點數，也未開始 7 日 shadow、24 小時 canary 或 14 日退役觀察。

## Snapshot · 2026-07-15

Status: `五站共用視覺語言已完成本機整合與瀏覽器驗證，尚未 commit／push／deploy`

- Public pages now mount the shared Kiwimu Universe rail; admin routes intentionally remain outside the public rail.
- Homepage adds the `05 / Dessert commerce` role label and shared lime primary-action treatment while preserving Shop's dark commerce identity.
- Verified `npx tsc --noEmit --incremental false --pretty false`, lint (0 errors, 11 existing warnings), 51-route production build, analytics/SEO local profile 11/11, homepage, `/checkout`, and rail exclusion on `/admin`.
- Desktop and 390px browser QA passed with no page-level horizontal overflow; the cart drawer covers the rail, exposes a labelled 44px close target, and restores the page after closing.
- Cart accessibility regression passed: closed state is inert/hidden, open state transfers and traps focus, Escape closes the dialog, focus returns to the opener, and body scrolling is restored.
- `/checkout` kept the public rail without submitting an order; `/admin` correctly excluded the rail. Local checkout only reported the expected unauthenticated 401 and LIFF custom-domain warning.
- No checkout submission, order creation, payment, production deployment, or Supabase write was performed in this visual-system pass.

## Snapshot · 2026-07-14

Status: `共用 Supabase migration、Shop PR #15 與 production deployment 已完成驗證`

- 共用 project `xlqwfaailjyvsycjnzkz` 的可執行 migration 統一由本 repo 發布，Map 不再獨立執行 `supabase db push`。
- `20260713000000_fix_mbti_claim_rpc_ambiguity.sql` 修正 `consume_mbti_claim` 的 PostgreSQL 42702 欄位歧義。
- `20260713000001_atomic_order_capacity_check.sql` 新增原子產能檢查與訂單建立 RPC，僅授權 `service_role`。
- `20260714000000_fix_atomic_order_payment_date_type.sql` 修正遠端 lint 發現的 `payment_date` timestamptz 型別不符（42804）。
- `20260714000001_restrict_atomic_order_rpc_permissions.sql` 明確撤銷 `PUBLIC`／`anon`／`authenticated`，訂單 RPC 僅保留 `service_role` 執行權。
- 發布順序固定為：核對遠端 history → `db push --dry-run` → 正式 `db push` → 權限／函式驗證 → 合併 Shop PR → production smoke。
- 2026-07-14 正式驗證：local／remote migration history 對齊；`db lint` 零 schema error；MBTI RPC 匿名呼叫 200 且無 42702；訂單 RPC 匿名呼叫 401／42501，僅 `service_role` 可進入函式；探測使用空 payload 並於 NOT NULL constraint 中止，未建立訂單。
- 2026-07-14 PR #15 已 squash merge 為 `e8195fd`，Vercel production deployment success。
- production smoke：首頁、checkout、商品頁、FAQ、shipping、refund、location、terms、privacy、robots、sitemap、menu API 全 200；analytics／SEO 15/15；桌面與 375px 行動版無水平溢出，Shop 頁面無 runtime console error（checkout 僅有未登入 `/api/auth/me` 的預期 401）。
- 無寫入訂單探測：對 `/api/order` 傳空 payload 回 400「缺少必要欄位」，探測前後訂單筆數一致，未建立訂單。
- 五站首頁 canary：Kiwimu、Shop、Passport、Gacha、Map 全 200、DOM 正常且無水平溢出；其餘站僅保留既有 Tailwind／LIFF／iframe warning，無 runtime error。

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
- 2026-07-10 已補 fresh-context 終簽（opus 獨立審查 `git diff origin/main..8eef2ce`）：**PASS、零必修**。逐條複驗 tsc/lint/build/verify:analytics-seo 11/11、硬 404＋noindex 實測、migration list 本地遠端一一對齊、diff 未觸及金流/RLS/.env、secrets 掃描 0 命中、Suspense 改動未犧牲 streaming（四頁各有 local boundary，checkout 獨立 layout 不受影響）。兩項 optional：404 頁有冗餘 robots meta（noindex 生效、無害）；banner RPC 為既有函式搬移非新授權。

Mail 接線（2026-07-10 補）：
- 斷點根因：寄件地址用未驗證子網域 `noreply@shop.kiwimu.com`，Resend 拒發；主網域 `kiwimu.com` 本來就已驗證。
- 已修：本機與 Vercel Production 的 `RESEND_FROM_EMAIL=noreply@kiwimu.com`＋`RESEND_FROM_NAME=月島甜點`（production 下次部署生效）；實測兩封信寄達 kk4e18@gmail.com（直打 Resend＋走 app `/api/send-email` 路徑各一）。
- `email_templates` 表補進版控：`20260710000002_email_templates_table.sql`（對 prod 為 no-op，已 push 套用）。
- 已知 follow-up：下單確認信是寫死 HTML 不吃後台模板；`src/handlers/email.handler.ts` 是未註冊死代碼；三個 Resend client 未共用；後台 `notification_settings.order_created` 目前只開 Discord、email 關著。
- 待 Penso 定案：營業時間矛盾——layout JSON-LD 寫「週二～六 10:00–19:00」，後台 settings 存「僅週日休 10:00–18:00」，信任頁沿用前者；哪個為真需一句話拍板後全站統一。

訂單通知鏈路 E2E 實測（2026-07-10 深夜輪）——**挖出三個 main 上既有的 P0 bug 並修復**：
1. `order.service.ts` 查 `menu_variants.variant_name`，實際欄位是 `spec` → **下單一律 500**（現行 production 部署較舊所以還能動，但 main 一部署就全站不能下單）。修法：PostgREST 別名 `variant_name:spec`。
2. `EventBus` handlers Map 是模組作用域，Next.js instrumentation 與 route bundle 各持一份 → **order.created/status_updated 通知（Email＋Discord）從未實際觸發**。修法：handlers 掛 `globalThis`（Prisma 單例模式）。
3. `orders` 表無 `updated_at` 欄位但兩條更新路徑都寫它 → **後台改訂單狀態一律失敗**。修法：migration `20260710000003_orders_updated_at.sql`（已套 prod）。
實測證據（living proof）：三筆測試單（ORD-D2708421353D5F7F / ORD-C53FC34D88C0A623 / ORD-17E91949918C0FB5，皆已取消）；信件實發 kk4e18@gmail.com ×5（確認信、取貨通知、取消通知×3）＋Discord bot→channel 成功。結論：**main 目前是地雷狀態，本分支合併部署的優先級升高**。

第二輪 E2E（2026-07-10，紅隊過關後）：
- 熱修紅隊 PASS 零必修；唯一 optional（dev HMR 重複註冊 → 重複發信）已封：註冊守衛掛 globalThis（`9d70671`）。
- **宅配輪 PASS**：ORD-19D0A61C36427DF2——運費伺服器重算正確（299＋100=399）、臺南市中西區地址入庫、確認信送達、已取消。
- **優惠碼輪 PASS**：ORD-810549C7CE675F8E——CLAUDETEST10（9 折）套用、伺服器重算 original 299／discount 30／final 269／promo_code 記錄正確、確認信送達、訂單已取消、測試碼已刪除。
- 尚待真人測試（無法自動化）：LINE Pay internal_test E2E、Google OAuth 會員流程、手機/LINE 內建瀏覽器結帳。n8n webhook 未掛在 EventRegistry（目前 active handlers 只有 email＋discord），是否要接由 Penso 決定。

第三輪測試（2026-07-10，安全＋營運規則＋Banner＋RWD）：
- **價格竄改防禦 PASS**：POST 假價 $1，DB 入庫為伺服器重算 $299（original/final/total 全對）。
- **RLS 探測 PASS**：anon key 讀 orders 回空陣列，7/4 加固有效；admin API 無 token 全 401（orders/settings/menu PUT）。
- **下架商品 PASS**：以 is_available=false 品項下單被拒。
- **前置天數 PASS**：<3 天被拒。
- **⚠️ 公休日三層矛盾（新發現，待 Penso 拍板哪天休再修）**：結帳文案寫「週一公休」；後台 settings 存「休週日」；伺服器實測週一（7/13）與週日（7/19）訂單都成立——公休規則在 server 端完全沒有擋板，UI 選擇器也全列。修法需等營業時間定案後三層一次對齊（JSON-LD/信任頁/checkout 文案/date picker/server 驗證）。
- **Banner 鏈路 PASS**：admin 建 announcement → 首頁 hero 區渲染（可關閉、帶連結）→ 刪除歸零。註：顯示位置在 hero 內，非 ponpie 式頁頂細條，要移最頂是另一小改。
- **RWD PASS**：375px 下商品頁/faq/shipping/location 皆無水平溢出；多規格選擇（四吋/六吋/八吋異價）正常。
- 測試殘留：零（測試單全取消、測試碼與測試橫幅已刪）。

第四輪（2026-07-10）：壓測、公休日拍板落地、安全掃描
- **產能上限 PASS**：同日連下 6 單 → 第 6 單被拒「當日已達產能上限 (5/5)」；取消 5 單後再下成立（取消正確釋放名額）。
- **公休日定案＝週一公休、10:00–18:00（Penso 拍板）**，五層一次對齊並實測：
  - 後台 `business_hours.closed_days=[1]`（唯一真相來源）
  - `order.service.ts` 新增 `assertNotClosedDay()` 伺服器擋板（UTC 取星期避時區偏移；設定讀不到 fail-open）
  - layout JSON-LD → 除週一外全列、closes 18:00
  - location/shipping/faq 文案統一
  - checkout 日期選擇器與文案改為吃 settings，非 hardcode
  - **E2E 實證**：週一 7/20 被拒「該日為公休日，請選擇其他取貨日期」；週日 7/19、週二 7/21 成立（皆已取消）
- **安全掃描（security-reviewer）PASS，1 必修 2 應修全數處理**：
  - 🔴 必修：`.env.local.bak-20260710`（本 session 早先為改 mail 設定所建）含近 30 組正式金鑰，`.gitignore` 的 `.env*.local` 抓不到 `.bak` 結尾。已刪檔；確認從未進 git 歷史（`git log --all -- <path>` = 0）；`.gitignore` 補 `.env*.bak*` 與 `*.bak-*` 並實測 `git check-ignore` 生效。
  - 🟡 gallery_urls 只在前端驗 https → 移進 `menu.service.ts` 的 `pickContentFields`；實測 `javascript:` 與 `http://` 被拒、合法 https 放行（測試殘留已清）。
  - 🟡 faq/layout 的 JSON-LD 用裸 `JSON.stringify` → 抽 `lib/json-ld.ts` 共用 `serializeJsonLd()`（`<` 轉義），三處統一。
  - 掃過乾淨：商品頁 slug/id 走參數化查詢無注入；新欄位皆純文字 JSX 渲染無 stored XSS；admin 端點全過 ensureAdmin；robots/sitemap 未外洩帶參數頁；diff secrets 0 命中。
- **跨站合約 PASS**：`/api/menu/categories` 本地與 production 回應結構一致，map.kiwimu.com 不受影響。
- **會員邊界 PASS**：未登入打 `/api/user/profile`、`/api/user/orders`、`/api/auth/me` 全 401。
- 驗證：tsc 0 errors／lint 0 errors（11 既有 warnings）／build 成功／`verify:analytics-seo --profile=local-build` 11 passed 0 failed。

第五輪（2026-07-10）：定價正確性 ＋ 併發壓測
- **多品項混合購物車 PASS**：布丁120×2＋巴斯克四吋299×1 → 伺服器重算 539（正確）。
- **免運門檻邊界 PASS**：宅配 subtotal 1050 ≥ 門檻 1000 → delivery_fee 0、final 1050；subtotal 120 < 門檻 → delivery_fee 100、final 220（DB 欄位實查）。
- **優惠碼低消擋板 PASS**：CLAUDEMIN500（滿500折50）→ $299 單被拒「訂單未達最低消費 $500」；$539 單折 50＝489（伺服器重算）。測試碼已刪。
- **🟠 併發競態 BUG（P1，新發現，未修）**：8 筆同日訂單併發 → **全部成立、衝破 5 上限**（預期只准 5）。根因：`check_daily_capacity` RPC 只讀當日筆數，與後續 `insertOrder` 是兩個獨立交易，中間無鎖 → 典型 TOCTOU；併發請求都在「尚無人插入」時通過檢查。位置：`src/services/order.service.ts:293-309`（檢查）＋ `src/repositories/order.repository.ts:84-96`（插入）。
  - 影響評估：月島每日上限 5，只有「同一取貨日、多筆訂單在檢查↔插入的數十~數百 ms 窗內」才觸發 → 真實低頻（不像先前三個 P0 是全站壞）。屬正確性債，過度承接時需人工取消致歉，不阻斷部署。
  - 修法（需獨立一輪＋fresh-context 審＋全訂單回歸）：做原子 RPC `insert_order_with_capacity_check`——`pg_advisory_xact_lock(hashtext('cap_'||date))` → 鎖內重查產能 → `jsonb_populate_record` 插入 → 單一交易返回；repository 改呼叫此 RPC 取代裸 `.insert()`。**不在本測試輪熱補關鍵路徑**，待 Penso 排期。
- 測試殘留：本輪 12 筆測試單全數 cancelled（ID 精確查核）、測試優惠碼已刪、無殘留。

第六輪（2026-07-10）：前後台完整 UI 實跑（瀏覽器驅動，非純 API）
- **前台 PASS**：首頁 29 商品＋6 分類區＋本季精選全渲染；搜尋過濾（打「抹茶」→ 只剩抹茶品項、伯爵/檸檬消失）；商品頁 3 規格切換＋加入購物車價格連動（六吋 $899 正確）；購物車加入→改量（×2 小計 $1798）→免運進度條（再買 $101 享免運 → 過千轉免運）→垃圾桶移除→空車；主題深/淺切換（data-theme 生效）。前台 session 零 console error。
- **後台 PASS**：18 個 API 端點全 200；13 個模組（orders/menu/banners/promo-codes/campaigns/customer-analytics/site-analytics/settings/email-templates/discord-settings/marketing-automation/push-templates/menu-availability）全部正常渲染、零 error boundary、零 console error；orders 顯示 43 筆＋狀態分頁；promo-codes 無測試碼殘留。
- **設定閉環驗證**：settings 後台公休日 UI 正確高亮「週一」（bg-moon-accent）、營業 10:00–18:00 → 對應前面測過的結帳擋板與伺服器拒單，整條 API→DB→UI→結帳→server 鏈路閉環。
- 本輪零程式碼變更，純 fresh 實跑驗證。

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
