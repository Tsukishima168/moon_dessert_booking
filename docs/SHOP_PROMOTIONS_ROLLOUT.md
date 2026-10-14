# Shop 優惠與公告：上線、驗證、回滾

## 範圍與狀態

只改 Shop；補上優惠期限／額度設定、會員限定與每人次數、公告詳情／按鈕文字、曝光互動統計及 Shop 會員優惠頁。正式 migration、活動發布與真人結帳尚未執行，不代表其他未完成商務流程已通過。

## 核准後的順序

1. 唯讀核對正式 `promo_codes`、`banners`、`orders` 欄位、migration 歷史、既有使用量與 grant。不要透過 SQL Editor 臨時補 DDL。
2. 備份相關表與權限；經店主同意，只套用 `supabase/migrations/20261013230000_shop_promotions.sql`。它新增會員欄位、私有名額／統計帳本及 RPC，收回匿名／一般登入帳號直接讀寫優惠表與舊公告計數 RPC 的權限。
3. 核對私有表、函式與欄位 grant。其他四站的現行來源未找到這些舊 RPC 或 `promo_codes` 呼叫，但外部系統與正式權限仍須核對；不能據此保證所有共享消費端已驗收。
4. 部署本 PR，確認舊部署流量已退出後才在後台建立會員活動。混用舊版程式時不要啟用新會員限制：舊程式不理解新欄位。
5. 用後台建立**店主確認的**停用活動，驗證儲存讀回，再依核准啟用。真人帳號／Safari／LINE 瀏覽器與低額結帳由店主簽收，包含登入優惠、同時名額、金額、取消與通知。自動化不代做真人付款或正式資料寫入。

## 失敗行為

新欄位／RPC 不存在時，優惠驗證與使用會拒絕放行，會員優惠單獨顯示重試；不會使整個會員資料頁消失。未輸入活動碼的既有結帳流程不依賴新 RPC。公告內容／統計新欄位需要 migration，先遷移再部署。

未知建單結果不自動釋放名額；只有已確認交易回滾的錯誤能釋放。取消／退款不自動補回，尚無自動釋放或人工名額調整介面。

## 回滾

先停用會員限定或有每人限制的活動，再回滾應用程式。保留已使用名額及事件表，不刪帳本，不把用量設成零，也不重新開放匿名 RPC。若撤銷優惠表 grant 導致外部既有消費端故障，需重新檢視該端呼叫與權限，不能直接恢復公開讀寫。

## 可重跑驗證

- `npm run test:promotions`：真實 TypeScript 模組 + 記憶體依賴，檢查格式、台灣日期、折扣四捨五入、白名單、會員與安全 URL。
- `npm run test:promotions:db`：需本機 `initdb/pg_ctl/psql`，測試自行建立臨時 PostgreSQL、只綁 Unix socket，測試後關閉刪除自己的暫存資料；不接受正式連線字串或讀取 `.env`。
- `npm run test:security`：既有訂單、驗證與通知的模擬迴歸，不呼叫真實供應商。
- `npx tsc --noEmit --incremental false --pretty false`、`npm run lint`、離線 fixture `npm run build`。
- Linux CI 用同樣方式執行，不能以 mock／臨時 schema 代替正式 Supabase 核對或真人驗收。

統計在 Vercel 僅取平台 `x-vercel-forwarded-for`，其他環境使用共用限流桶。頭部可信度依 [Vercel 官方文件](https://vercel.com/docs/headers/request-headers)，不用客戶自填的轉送頭推導身分。
