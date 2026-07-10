# Shop 內容與資訊架構升級藍圖 — 對標 ponpie.tw

日期：2026-07-10
狀態：P0+P1+P2-lite 技術層已實作；待真實內容補齊與分支整合/部署
對標研究原檔：session scratchpad `ponpie-research.md`（研究方法與來源 URL 見該檔附錄）
現況盤點：由唯讀 subagent 掃 repo 產出，出處以 `檔案:行號` 標註於各節

## 原則（Penso 已定調）

1. **借內容與架構，不借風格**：所有新頁沿用月島既有設計語言（現行 Tailwind token、Navbar、卡片樣式），不引入 ponpie 視覺。
2. **差異化資產保留並強化**：MBTI 推薦、Kiwimu Universe 角色敘事是 ponpie 沒有的，是月島的敘事引擎（ponpie 用「小農溯源」當引擎，我們用「角色 × 甜點」）。
3. **憲法不動**：No UI-DB / 3-Tier / EventBus；schema 變更只走 migration 檔（硬規則 7）。

## 2026-07-10 實作裁決

- 本輪納入：P0 商品層、P1 信任頁與共用 Footer、P2 僅宅配/自取標示。
- 本輪排除：blog、節慶 landing page、通路價差但書、P3 敘事層。
- production schema 已套；Vercel 尚未部署。
- 食品配方、配送政策與法遵文字仍由 Penso/法務提供真實內容，未補齊前不得把信任頁視為 production 完稿。

---

## 差距總表

| 面向 | ponpie 現狀 | shop 現狀 | 差距等級 |
|---|---|---|---|
| 商品詳情頁 | 獨立 URL ×140+，含完整規格/但書/JSON-LD | 無獨立頁，僅列表展開卡片（`components/ProductRow.tsx`） | **P0** |
| 商品內容欄位 | 尺寸/附贈/保存/配送/預購天數/檔期效期 | 只有名稱/價格/描述/規格名/圖（`lib/supabase.ts:46-69`） | **P0** |
| 信任內容頁 | FAQ/訂購須知/宅配須知/退換貨/隱私/條款/門市 | 只有 `/about`；FAQ 僅存在 JSON-LD 內肉眼不可見（`app/about/page.tsx:22-59`） | **P0-P1** |
| 全站 Footer | 會員/客服/聯絡/社群四區，連到所有信任頁 | footer 只內嵌在首頁（`app/page.tsx:555-604`），非共用組件 | **P1** |
| 物流意圖導覽 | 分類名直標「可宅配/限自取」＋平行 delivery-* 入口 | 分類只按品類分 | **P2** |
| 節慶檔期 | 獨立 landing page＋檔期分類排導覽第一位 | 缺（admin 已有 campaigns/banners 模組可接） | **P2** |
| 內容行銷 | 部落格 4 分類 60+ 篇＋首頁三分頁 tab | 缺（生態系另有 penso-good-blog，見決策點 1） | **P3** |
| 過敏原/成分 | 散落文字、非結構化（**ponpie 的弱項**） | 缺 | P0 內做成結構化欄位＝**超車機會** |

---

## P0 — 商品內容層（先做：轉換率與 SEO 的地基）

### P0-1 獨立商品詳情頁 `/product/[slug]`
- 每個商品一個 URL：可分享、可被搜尋、可掛 Product JSON-LD（含 `offers.availability` 即時同步、`priceValidUntil` 綁檔期截止——ponpie 做法，研究檔 §3）。
- 列表卡片保留現有互動，「查看詳情」導向新頁。
- sitemap.ts 動態收錄商品頁；robots.ts 放行 `/product/*`（現行只允許 `/`、`/about`、`/llms.txt`）。

### P0-2 商品欄位擴充（Supabase migration）
新增欄位（menu_items 或延伸表）：
| 欄位 | 型別建議 | 對應 ponpie 做法 |
|---|---|---|
| `tagline` 賣點副標 | text | 「品名｜賣點一句話」命名式 |
| `size_info` 尺寸/份量 | text | 規格區 bullet |
| `ingredients` 成分 | text[] 或 jsonb | ponpie 散落文字 → 我們結構化 |
| `allergens` 過敏原 | text[]（enum 字典） | 同上，做成可篩選標籤 |
| `storage_info` 保存方式/期限 | text | 「冷藏3日」式 |
| `delivery_type` 配送方式 | enum: pickup_only / delivery_ok / both | 分類與商品頁雙層標示 |
| `lead_time_days` 預購前置天數 | int | 「需提前 3 個工作日下單」 |
| `gallery_urls` 多圖 | text[] | 現行僅單張 image_url |
| `available_from` / `available_until` 檔期 | timestamptz | 綁 JSON-LD priceValidUntil |
| `included_items` 附贈 | text | 插卡/蠟燭/提袋 |

admin menu 模組同步補這些欄位的編輯 UI。

### P0-3 固定但書模板（全站共用組件）
三句話組件，掛在每個商品頁（ponpie 整套值得抄，研究檔 §3）：
1. 預購前置：「本品需提前 N 個工作日預訂」（吃 `lead_time_days`）
2. 急件備援：「急件請洽門市或官方 LINE」→ 把來不及預購的客人導去人工，不流失
3. 通路但書：視月島實際通路狀況決定要不要（有市集/快閃就要）

## P1 — 信任內容頁＋全站 Footer

新增 route（靜態頁，文案 hardcode 起步，符合現有 about 頁模式）：
- `/faq` — 把 about 頁 JSON-LD 裡的 4 題 FAQ 變成肉眼可見頁面並擴充（配送、保存、預購、客製、付款）
- `/shipping` — 訂購與配送須知（自取地點/時段、宅配範圍與運費、冷藏冷凍規則）
- `/refund` — 退換貨政策（食品類特殊規則要寫清楚）
- `/location` — 門市/自取資訊（地址、營業時間、地圖；layout.tsx 既有 Bakery JSON-LD 地址可複用）
- `/terms`、`/privacy` — 法遵基本盤

配套：
- **Footer 抽成共用組件**進 `app/layout.tsx`（現在只有首頁有 footer），四區結構參考 ponpie：購物說明（faq/shipping/refund）／品牌（about/location/媒體）／會員／社群+聯絡（LINE、IG、email、營業時間）
- sitemap/robots 同步放行新頁
- 文案由 Penso 提供事實（運費、時段、政策），AI 起草他審

## P2 — 導覽與檔期架構

- **分類標註物流限制**：分類顯示名帶「可宅配/限自取」，資料層吃 P0-2 的 `delivery_type` 聚合
- **「可宅配」平行入口**：一條 query/route 列出所有 delivery_ok 商品，服務送禮/外縣市客
- **節慶檔期位**：導覽第一位保留給當期 campaign（吃現有 admin campaigns 模組），節慶 landing page 用 campaign 資料渲染 `/event/[slug]`
- 熱銷榜/本季限定分類（吃現有訂單資料或人工策展）

## P3 — 內容敘事層（長線，依決策點 1 定案後排）

- 首頁中段做**三分頁 tab**（ponpie 省版位手法，研究檔 §2.6）：
  - Tab A「Kiwimu 故事」— 角色 × 甜點連載（取代 ponpie 的產地拜訪；素材源自 KIWIMU_BRAND_IDENTITY canon）
  - Tab B「最新消息」— 檔期公告、新品（吃 admin banners/campaigns）
  - Tab C「媒體/客人回饋」— 信任狀
- 長文章放 penso-good-blog，shop 只做導流卡（見決策點 1）

## SEO 補充（沿用既有收斂，不重做）

- Title 模式統一：`〔頁面主體〕｜月島甜點`（ponpie 用品牌名固定尾綴，一致性有利品牌詞 SEO）
- 分類/列表頁 meta description 動態塞當季商品名（ponpie 做法：換季自動更新關鍵字，研究檔 §5）
- 既有 GA4/`verify:analytics-seo` 管線延伸驗新頁面

---

## 需要 Penso 拍板的決策點

1. **Blog 邊界**：內容行銷長文放 penso-good-blog（shop 只導流）還是 shop 內建 blog？涉及站點邊界憲法，建議前者。
2. **節慶 landing page 投入**：做的話每檔期需要營運內容（文案+圖），是否納入常態營運節奏？
3. **成分/過敏原資料**：需要 Penso 提供每品項真實配方資訊，這是內容生產不是工程。
4. **通路價差但書**：月島有沒有多通路定價差異？沒有就不做這條。
5. **順序**：建議先把 production 部署最新 build（修掉現有 3 個 production SEO fail，見 CURRENT.md 2026-06-05），再開 P0；next16-upgrade 分支合併時點另議。

## 驗收條件（動工時逐項機器可查）

- P0：`curl -s https://shop.kiwimu.com/product/<slug>` 200＋HTML 含 Product JSON-LD；migration 檔存在於 supabase/migrations/；`npm run build` 過
- P1：6 個新 route 200；footer 出現在非首頁頁面；sitemap.xml 含新頁
- P2：分類 API 回傳含 delivery_type 聚合；campaign 導覽位由 admin 資料驅動
- 全程：`npx tsc --noEmit`、`npm run lint` 0 errors、`npm run verify:analytics-seo -- --profile=local-build` 全過
