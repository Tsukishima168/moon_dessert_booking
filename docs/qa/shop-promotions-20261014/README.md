# Shop 優惠／公告候選驗證

日期：2026-10-14（工作從 10-13 開始）。正式 migration、活動發布、真人登入／訂單／付款／通知送達均未執行。

## 作者自驗

- Node 優惠測試 26 項、原生 PostgreSQL 28 項、既有 security 模擬迴歸通過。
- TypeScript／離線 build 通過；lint 0 error、7 warning，包含既有 Hook 與原始 img 使用警告。
- 原生 PG 使用測試自行建立的臨時 schema 與 Unix socket；不能代替正式 Supabase 結構／ACL 讀回。
- UI 直接匯入本 PR 來源元件，配本機記憶體 API；沒有修改後台驗證以繞過登入。範例會員、優惠及公告均為虛構，HMR／重啟會重置展示資料。
- 預覽只簽元件操作與排版，不等同完整正式首頁的字型／主題／菜單資料簽收。未實機 Safari／LINE／VoiceOver。

## 最終 UI 結果

320／390／768／1280px：優惠及公告表單無溢出，文字輸入 16px，按鈕與核取框 label ≥44px。公告、會員優惠無頁面橫向溢出。會員分頁排列為 column，panel 分別 278／348／726／1120px，與分頁容器等寬，選中分頁清楚可見。

已實走錯誤期限保留輸入、修正儲存回讀、使用量不被改寫、自訂按鈕文字、詳情分行、複製提示、24 次 Tab 焦點限制、Escape 回原按鈕、公告導向會員優惠與空訂單分頁。

## 保留失敗與自我更正

- 初次「無橫向溢出」不足以代表可讀：完整截圖發現會員分頁左右排列，優惠 panel 只剩 98.04px。加明確 flex-col 與 Tailwind 3 支援的 active selector 後重驗；第一次拿到舊 HMR class，乾淨重建預覽後才取得上列結果。
- 40 個連續英文字按鈕原有 187px 內部溢出、詳情 38px；加入可收縮的換行 span，**同組內容**重驗均為 0，未放寬條件。
- 初次字級量測包含 checkbox 的 14px 繼承值；文字輸入與核取框可點區域應分別檢查。原始 failed attempts 保留在 ui-results.json，不宣稱整輪從未失敗。
- 歷史 console 包含隔離預覽初建 alias 錯誤，修正 alias 後運行正常；不能稱全歷程 console 0。

## 獨立程式覆核

Fresh-context 審查最終 APPROVE，來源 patch SHA256
`e369b7421870ce0890e353c9ad8c7dd888585d5d9f94476209d942c32159b00c`。
覆核包括付款前名額保留、不明建單結果、legacy 改碼、JS／SQL 小數精度、安全 URL、CI 與回滾；獨立跑 Node 26／security 與精確算式抽查。原生 PG、建置、UI 是作者自驗，非獨立視覺或商務簽收。

本資料夾的截圖與記錄於 source 覆核後追加，不修改 runtime。完整上線與回滾順序見 [SHOP_PROMOTIONS_ROLLOUT.md](../../SHOP_PROMOTIONS_ROLLOUT.md)。
