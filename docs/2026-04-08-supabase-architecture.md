# Supabase 架構 SSOT
> 最後更新：2026-05-11
> 負責人：shop（moonisland DB 主控）

---

## 1. Supabase 專案狀態

| 代號 | Project ID | 用途 | 使用方 |
|---|---|---|---|
| **moonisland** | `xlqwfaailjyvsycjnzkz` | 主庫：用戶、訂單、商品、SSO、積分、MBTI 用戶資料 | shop / passport / gacha / map / kiwimu |
| **kiwimu-legacy** | `uvddrlkmdvbuxlyjjpao` | 舊內容庫：MBTI 測驗題目與結果文案 | retired reference |

> **原則：現行 runtime 只接 moonisland。** kiwimu-legacy 不再作為登入、用戶資料、訂單、積分或菜單來源。

---

## 2. 五站連線矩陣

| 站 | env var 前綴 | 指向 DB | client 類型 | 主要用途 |
|---|---|---|---|---|
| **shop** | `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | moonisland | anon（瀏覽器）+ service_role（server） | 商品/訂單/後台 |
| **passport** | `VITE_SUPABASE_*`（fallback `VITE_MOON_ISLAND_SUPABASE_*`） | moonisland | anon + cookie auth | 用戶登入/護照/積分 |
| **gacha** | `VITE_SUPABASE_*` | moonisland | anon | gacha 抽獎/事件追蹤 |
| **map** | `VITE_SUPABASE_*`（假設同 moonisland） | moonisland | anon | 菜單展示/地圖訂單 |
| **kiwimu.com** | 見下表 | moonisland | auth client + mbti schema client | MBTI 測驗 + 用戶 SSO |

### kiwimu.com 連線

| client 檔案 | env var | 指向 | 用途 |
|---|---|---|---|
| `utils/supabaseAuthBridge.ts` | `VITE_MOON_ISLAND_SUPABASE_*` 或 `VITE_SUPABASE_USER_*` | **moonisland** | SSO bridge：shared cookie session、update_last_seen、insert_user_event |
| `supabase/user-client.ts` | `VITE_SUPABASE_USER_*` 或 `VITE_MOON_ISLAND_SUPABASE_*` | **moonisland** (schema: `mbti`) | MBTI 用戶資料、測驗紀錄、分享連結 |
| `utils/dataLoader.ts` | local constants + `/api/mbti-dessert` | **moonisland via shop/map contract** | MBTI 題目/結果本地載入，甜點推薦走 canonical menu contract |

---

## 3. moonisland 表格清單（2026-04-08 live）

### 核心業務表

| 表 | 主控站 | 讀取方 | 狀態 |
|---|---|---|---|
| `menu_categories` | shop | shop / map | ✅ active |
| `menu_items` | shop | shop / map / kiwimu | ✅ active |
| `menu_variants` | shop | shop / map | ✅ active |
| `menu_item_availability` | shop | shop | ✅ active |
| `menu_item_aliases` | shop | map | ✅ active（2026-04-07，35筆）|
| `mbti_menu_links` | shop | shop / kiwimu | ✅ active（2026-04-07，16筆全齊）|
| `orders` | shop | shop | ✅ active |
| `promo_codes` | shop | shop | ✅ active |
| `business_settings` | shop | shop | ✅ active |
| `banners` | shop | shop | ✅ active |

### 用戶 / SSO 表

> `orders.checkout_site` 為 shared DB 下的硬站點範圍欄位；`source_from` 只保留 attribution，不可再拿來做 tenant/site 判斷。

| 表 | 主控站 | 讀取方 | 狀態 |
|---|---|---|---|
| `profiles` | passport | 全站 | ✅ active（含 `v2_unlocked_at`）|
| `user_events` | shop/SSO | shop / kiwimu bridge | ✅ active |
| `point_transactions` | shop | passport / shop | ✅ active |
| `passports` | passport | passport | ✅ active |
| `admin_sessions` | shop | shop admin | ✅ active（app stores SHA-256 token hash only） |
| `admin_auth_attempts` | shop | shop admin | ✅ active（Supabase-backed admin login limiter） |

### 遊戲 / 積分表

| 表 | 主控站 | 狀態 |
|---|---|---|
| `gacha_draws` | gacha | ✅ active |
| `special_eggs` | gacha | ✅ active |
| `daily_checkins` | passport/gacha | ✅ active |
| `reward_claims` / `reward_inventory` | passport | ✅ active |
| `quest_completions` | passport | ✅ active |
| `badges` / `user_badges` | passport | ✅ active |
| `mbti_claims` | kiwimu | ✅ active |

### Analytics / Views（唯讀）

| 表/View | 狀態 |
|---|---|
| `v_point_history` | ✅ view |
| `v_user_points_summary` | ✅ view |
| `user_funnel_summary` | ✅ view |
| `v_user_journey` | ✅ view |
| `v_funnel_conversion` | ✅ view |
| `daily_order_stats` / `shop_daily_sales` | ✅ active |
| `shop_order_summary` / `shop_product_performance` | ✅ active |
| `audit_logs` | ✅ active（server-only RLS） |
| `notification_logs` | ✅ active（server-only RLS） |

### 待退役表

| 表 | 狀態 | 計劃 |
|---|---|---|
| `mbti_recommendations` | ⚠️ 零查詢（全站 grep 確認 2026-04-07） | 評估期：2026-05-01 決定 DROP |
| `menu_items.mbti_type` column | ⚠️ MenuItem interface 未包含，實質未使用 | 同上 |

---

## 4. RLS 狀態摘要（2026-04-08）

| 表 | admin policy | 匿名寫入漏洞 |
|---|---|---|
| `menu_items` | `auth.jwt() ->> 'role' = 'admin'` | ✅ 已修（2026-04-07）|
| `menu_item_availability` | `auth.jwt() ->> 'role' = 'admin'` | ✅ 已修（2026-04-07）|
| `menu_item_aliases` | `auth.jwt() ->> 'role' = 'admin'` | ✅ 建立時即正確 |
| `mbti_menu_links` | `auth.jwt() ->> 'role' = 'admin'` | ✅ 建立時即正確 |
| `audit_logs` | service role server-only | ✅ 2026-05-11 migration hardens RLS + revokes anon/authenticated |
| `notification_logs` | service role server-only | ✅ 2026-05-11 migration hardens RLS + revokes anon/authenticated |
| `admin_sessions` | service role server-only | ✅ active；application stores token hash, not raw cookie token |
| `admin_auth_attempts` | service role server-only | ✅ active；rate limiter fails closed on DB error |

### 2026-05-11 封測前 migrations

| Migration | 目的 | 部署要求 |
|---|---|---|
| `20260510000000_add_missing_availability_rpcs.sql` | 補 `check_menu_item_availability` / `get_available_dates` RPC，讓 shop frontend/backend 共用同一套可訂購判斷 | 封測前套用到 moonisland production |
| `20260511000001_harden_admin_log_rls.sql` | 將 `audit_logs` / `notification_logs` 改為 service-role-only，避免 anon/authenticated client 讀寫營運紀錄 | 封測前套用到 moonisland production |

### 已知冗余（已清理）

- `menu_items` 曾有兩條 public SELECT policy：`Public can view items` + `public_can_view_items`
  - 原因：歷史遺留，功能等價
  - 2026-05-04 已在 moonisland production 執行：`DROP POLICY IF EXISTS "public_can_view_items" ON public.menu_items;`
  - 保留：`Public can view items`、`Allow admin full access to menu items`

---

## 5. kiwimu-legacy 表（retired reference）

這些表屬於舊內容庫。現行 kiwimu.com runtime 不再直接讀取這些表；MBTI 題目/結果由本地 constants 載入，甜點推薦由 `mbti_menu_links` + `menu_items` + `menu_variants` resolve。

- `mbti_questions`
- `mbti_results`
- `mbti_variant_nuances`
- `mbti_character_images`
- `mbti_dessert_mappings`
- `dimension_explanations`

> 現行身份主線：Supabase Auth on moonisland。不要再新增對 kiwimu-legacy 的 runtime dependency。

---

## 6. 待辦狀態

| 狀態 | 優先 | 項目 | 處理結果 |
|---|---|---|---|
| ✅ 完成 | 🟡 P2 | kiwimu.com Firebase → Supabase Auth 完整遷移（5-7h，大任務） | 2026-05-04 已確認 runtime auth 使用 `supabaseAuthBridge` → moonisland，`user-data.service.ts` 為 Supabase-only，並移除 auth client 對泛用 `VITE_SUPABASE_*` legacy fallback。剩餘 Firebase / Firestore 多為舊文件或 Discord bot reference，不是前台登入主線。 |
| ✅ 完成 | 🟡 P2 | gacha Vercel Preview 環境補設 `VITE_SUPABASE_URL`（非阻塞） | 2026-05-04 已用 Vercel CLI 確認 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 存在於 Development、Production，且 Preview 分支已有設定。 |
| ✅ 完成 | 🟢 P3 | 清除 `menu_items` 重複 SELECT policy `public_can_view_items` | 2026-05-04 已在 moonisland production 移除。 |
| ✅ 完成 | 🟢 P3 | 2026-05-01 評估 DROP `mbti_recommendations` + `menu_items.mbti_type` column | 2026-05-04 已查 production：`mbti_recommendations` count = 0，`mbti_menu_links` active = 16；`menu_items.mbti_type` 仍有 legacy 值。結論：`mbti_recommendations` drop-ready；`menu_items.mbti_type` 需備份或另開 destructive migration 後再刪。 |
