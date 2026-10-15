# Shop 設計說明

## 2026-10-06：月島深綠系列（已部署基線）

Penso 已選定 Map／Passport／Gacha 的深綠、奶油白、柔金方向；Shop 延續此系列。MBTI 維持獨立。這份規格取代早期黑白藝術館方向；PR #27–29 已合併並部署，2026-10-07 接手查核的正式基線為 `f08753e`。

- 配色對齊 Map：森林深綠 `#1F2F1F`、Hero `#1F3527`、窗景綠 `#304F2F`、奶油白 `#F5F0E8`、日光金 `#D7C678`。
- 首頁使用固定品牌奶油白閱讀表面＋深綠Hero，照片與價格卡使用紙白；商品／cart／checkout保留深淺色切換。淺底小字與價格使用深綠或深金 `#795B23`，不使用日光金文字。
- 主標與全站本文用 Noto Sans TC（2026-10-14 起由 Shop 自己在 layout `<head>` 載入，不再靠 Universe rail CSS 的 `@import`），字級／字重對齊 Passport／Gacha。後台 `.admin-shell` 原token保持。
- Hero桌機44px／手機32px（320px寬用30px）、section28／24px，內文15–16px，輔助文字至少12px。
- Hero24／22px圓角、商品卡16px、主要按鈕12px；移除獨立的宋體與大拱角。
- 主要入口「選購甜點」56px；規格、數量、搜尋清除與次級連結至少44px。手機輸入16px，避免 Safari 自動縮放。
- 森林版Universe rail（深綠`#1F2F1F`、奶油字、目前站點以柔金`#D7C678`標示）仍是共用導覽識別，依Map既有設計契約保持；Shop導覽列疊在rail下方，層級見 2026-10-14 一節。

## 首頁工作

單一主要行動：選甜點。商品實拍是主角；奶油邊框的照片與淡金按鈕連結月島識別。首屏→照片選購→中文分類與品項展開→三步驟說明→會員與品牌次級入口。

四個照片入口取自當下可預訂、有規格的商品；不宣稱人氣／當季銷量。起價由真實 variants 最低價計算。原有搜尋、MBTI推薦、來源歸因、分類順序保留；分類只做顯示名稱簡化。飲品維持門市展示，缺價格不顯示零元。

## 購買流程

桌機菜單放大照片、完整品名、規格選項與加入購物車；手機收合先看縮圖與起價，展開再選規格與數量。已售完與缺規格商品不能加入。商品頁保留資料庫提供的成分、保存與過敏原；沒有資料就不補寫。

購物車保留 focus trap、Escape、inert、數量、優惠與結帳事件。結帳表單只改色彩與排版，原有付款 gate、日期驗證、待付款恢復、配送限制均保留。LINE Pay 分店工作仍在 PR #26，未合併。政策草案未核定；本次公開文字修復以現行功能與核定營業資訊為準。

## 驗收

檢查320／390／768／1280px首頁、商品、購物車與結帳頁；搜尋／清除、規格／数量、移除、淺深色切換。UI測試不建立訂單、不付款、不登入或寄信。支援鍵盤focus與減少動態設定。正式政策與真人付款待各自核定，不能以視覺驗收取代。

## 2026-10-07：公開文字與可讀性修復（本機待審）

- 移除對外政策、FAQ、運送與門市頁的內部待補／開發註記，以訂單編號、LINE 聯絡與事前確認說明取消、保存、客製及配送；不新增退款期限、個資保存期限或七日解除權排除。
- 營業時間依 Tsuki-SSOT `06_行銷企劃/LINE官方帳號_漏斗與設定_2026-10-02.md:46` 核准版：週二至五13:00–18:00、週末11:00–18:00、週一公休，同步可見文字、metadata及JSON-LD。營業與預訂取貨分開說明；取貨排程、business_settings與DB未變更。
- Shop淺色focus selector排除Universe rail；優惠碼按鈕／狀態文字採可讀的主題顏色、低透明度輔助字恢复完整色值，商品配送徽章至少12px。
- Email fallback與確認通知採深綠／紙白、無未核定24小時匯款承諾；新版banner建立預設深綠／紙白。商家已有DB顏色與自訂Email模板保留。
- 公開API一般失敗回客戶用語，保留原HTTP狀態、授權、付款gate與驗證判斷；診斷仍留server log。没有實際發信／付款／下單／DB操作。
- 主對話CUA已檢查四種寬度的首頁、商品與資訊頁，無水平溢出、可見破圖0；淺色rail鍵盤焦點維持柔金。通知HTML動態文字已轉義、商家自訂模板保留。完整地址補齊168號。最終build／typecheck／lint通過（0error／11既有warning）。
- 未部署；審查員額度受限，最終patch尚未獨立簽收。真人Safari／LINE、真實通知與結帳未驗。送審Git與hash以同日SSOT及final-manifest回讀為準。

- 商品分類只顯示既有中文名稱；內部slug保留於資料／篩選與URL契約，缺描述不顯示內部準備中文字。

## 2026-10-14：風格升級 Phase A（本機，未部署）

依獨立驗收報告（Shop B+）與共同規則 `common.md`；只改樣式，不碰結帳／付款／訂單邏輯。

- 主行動 `.shop-cta`（Phase B 依表面修訂，見下一節）：套用在商品頁與清單的加入購物車、購物車抽屜與行動購物車列的前往結帳、結帳送出、帳號頁「開始訂購」、頁尾 CTA。與首頁 `.shop-primary` 同色。已選規格這類「目前狀態」晶片維持原樣。
- 導覽列分層：導覽列在 rail 下方，交界 1px `rgba(215,198,120,.22)`；深色主題導覽列底色 `#243624`（rail 是 `#1F2F1F`）。帳號頁 sticky 標頭用 `--ku-rail-height`＋`--shop-navbar-h` 疊在兩者下方（導覽列高度改動時要同步改 `--shop-navbar-h`）。
- 字體只有一套：`--font-sans`＝Noto Sans TC 優先、Inter 後備；`<link>` 載入 300／400／500／700（Phase B 補 300，`brand-display` 等細字重才不會落到 400）。
- 焦點環：全域深色面柔金、淺色面 `#304F2F`；頁籤內容、後台編輯器（`.ProseMirror`）補上 focus-visible 環。
- reduced-motion：全域 catch-all（同 Map），含購物車抽屜。公開頁文字最小 12px。
- 資訊頁中文大標手機（≤640）字距 0.06em＋`text-wrap: balance`，避免孤字。

## 2026-10-15：風格升級 Phase B（本機，未部署）

- 共用 rail kit：`components/KiwimuUniverseRail.tsx`、`styles/kiwimu-universe.css` 與 kit byte-identical（sha256 見 kit `SHA256SUMS`），不在 Shop 內改。站點差異只走 props 與 `app/globals.css`：`--ku-nav-z: 35`（收合層級，讓購物車 overlay 40／drawer 50 壓在 rail 上；展開的「更多」用 kit 預設 210）、桌機 `.ku-universe-rail + .shop-navbar { top: var(--ku-rail-height) }`。kit 不載字體，Noto Sans TC 由 layout `<head>` 的 `<link>` 載一次。
- 主行動規則（依所在表面）：深色面（深色主題的商品頁、購物車抽屜、結帳、資訊頁、行動購物車列）＝柔金底 `#D7C678`＋深綠字 `#1F2F1F`（8.24:1）；淺色面（淺色主題，以及首頁固定奶油閱讀區 `.shop-home`，深色主題也一樣）＝深綠實心 `#1F2F1F`＋奶油字 `#F5F0E8`（12.47:1），hover 中綠 `#304F2F`。首頁深綠 Hero 的「選購甜點」`.shop-primary` 維持柔金。
- GA4 `universe_nav_click`（Shop）：rail 每個連結點擊（含森林展覽、本站連結、「更多」面板內連結）都送，經 `lib/shop-analytics.ts` 的 `trackShopEvent` → `gtag('event', …)`；非正式網域（`__KW_GA_ENABLED !== true`）不送。參數 12 欄＋Shop 脈絡：
  `source_site`（`shop`）、`target_site`（`kiwimu`／`passport`／`map`／`gacha`／`shop`／`canopy`）、`viewport`（如 `390x844`）、`viewport_width`、`viewport_height`、`viewport_category`（≤640 `mobile`／≤1024 `tablet`／其餘 `desktop`）、`login_status`（`authenticated`／`anonymous`／`unknown`，掛載時讀一次 `supabase.auth.getSession()`，不走 `getResolvedUser`）、`surface`＝`entry_surface`（`universe_rail`）、`link_name`（`MBTI`／`Passport`／`Map`／`Gacha`／`Shop`／`Canopy`）、`destination_type`（站內 `cross_site_nav`、森林展覽 `external`）、`transport_type`（`beacon`）；`trackShopEvent` 另加 `site_id`（`shop`）與 attribution／UTM。分析時請用 `source_site != target_site` 過濾（本站連結也會送）。新欄位要在 GA4 報表出現，需另外登錄自訂維度。
