# Supabase 架構 SSOT
> 最後更新：2026-04-08  
> 負責人：shop（moonisland DB 主控）

---

## 1. 兩個 Supabase 專案

| 代號 | Project ID | 用途 | 使用方 |
|---|---|---|---|
| **moonisland** | `xlqwfaailjyvsycjnzkz` | 主庫：用戶、訂單、商品、SSO、積分 | shop / passport / gacha / map + kiwimu（bridge） |
| **kiwimu-legacy** | `uvddrlkmdvbuxlyjjpao` | 內容庫：MBTI 測驗題目與結果文案 | kiwimu.com 專用 |

> **原則：不可混用。** kiwimu-legacy 只存靜態內容，不存用戶資料。

---

## 2. 五站連線矩陣

| 站 | env var 前綴 | 指向 DB | client 類型 | 主要用途 |
|---|---|---|---|---|
| **shop** | `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | moonisland | anon（瀏覽器）+ service_role（server） | 商品/訂單/後台 |
| **passport** | `VITE_SUPABASE_*`（fallback `VITE_MOON_ISLAND_SUPABASE_*`） | moonisland | anon + cookie auth | 用戶登入/護照/積分 |
| **gacha** | `VITE_SUPABASE_*` | moonisland | anon | gacha 抽獎/事件追蹤 |
| **map** | `VITE_SUPABASE_*`（假設同 moonisland） | moonisland | anon | 菜單展示/地圖訂單 |
| **kiwimu.com** | 見下表（三條連線） | moonisland + kiwimu-legacy | 三個 client | MBTI 測驗 + 用戶 SSO |

### kiwimu.com 三條連線（特殊）

| client 檔案 | env var | 指向 | 用途 |
|---|---|---|---|
| `supabase/client.ts` | `VITE_SUPABASE_URL/ANON_KEY` | **kiwimu-legacy** | 讀 MBTI 測驗內容（questions / results / images） |
| `supabase/user-client.ts` | `VITE_SUPABASE_USER_URL/ANON_KEY` | **moonisland** (schema: `mbti`) | 雙寫用戶資料（Firebase primary） |
| `utils/supabaseAuthBridge.ts` | `VITE_MOON_ISLAND_SUPABASE_URL/ANON_KEY` | **moonisland** | SSO bridge：update_last_seen / insert_user_event |

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
| `admin_sessions` | shop | shop admin | ✅ active |

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
| `audit_logs` | ✅ active |

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

### 已知冗余（不影響功能，待清理）

- `menu_items` 有兩條 public SELECT policy：`Public can view items` + `public_can_view_items`
  - 原因：歷史遺留，功能等價
  - 修法：`DROP POLICY "public_can_view_items" ON public.menu_items;`（確認後執行）

---

## 5. kiwimu-legacy 表（MBTI 內容）

這些表只有 kiwimu.com 讀取，moonisland **沒有**這些表：

- `mbti_questions`
- `mbti_results`
- `mbti_variant_nuances`
- `mbti_character_images`
- `mbti_dessert_mappings`
- `dimension_explanations`

> ⚠️ kiwimu-legacy 未做 SSO，P2 任務是將 kiwimu.com auth 從 Firebase 遷移到 moonisland。

---

## 6. 待辦

| 優先 | 項目 |
|---|---|
| 🟡 P2 | kiwimu.com Firebase → Supabase Auth 完整遷移（5-7h，大任務）|
| 🟡 P2 | gacha Vercel Preview 環境補設 `VITE_SUPABASE_URL`（非阻塞）|
| 🟢 P3 | 清除 `menu_items` 重複 SELECT policy `public_can_view_items` |
| 🟢 P3 | 2026-05-01 評估 DROP `mbti_recommendations` + `menu_items.mbti_type` column |
