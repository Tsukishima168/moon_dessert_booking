---
type: verification-runbook
status: active
scope: shop
domain: shop.kiwimu.com
updated: 2026-06-04T18:35:00+08:00
last_writer_tool: Codex
---

# VERIFY.md — shop.kiwimu.com

本檔是 Shop 每次改版、部署、金流或後台設定調整前後的固定驗證清單。

## 開工前

```bash
git status --short --branch
git log -1 --oneline
```

標準：

- 必須在 `/Users/pensoair/Desktop/Web-Projects/sites/shop-kiwimu-com`。
- 不在 workspace root 做功能開發。
- 若有未追蹤檔，先判斷是否為使用者工作或重複檔，不可直接覆蓋。

## 本機基礎 gate

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

標準：

- `lint` 不可有 error。
- `tsc` 必須 pass。
- `build` 必須 pass。
- 既有 warning 需記錄；新增 warning 需判斷是否與本輪有關。

## Production smoke

不觸發付款，只確認 production 存活與 guard 狀態。

```bash
curl -I https://shop.kiwimu.com/
curl -I https://shop.kiwimu.com/api/menu
curl -sS https://shop.kiwimu.com/api/settings
curl -sS https://shop.kiwimu.com/api/payment/linepay/status
```

標準：

- 首頁 HTTP 200。
- `/api/menu` HTTP 200。
- `/api/settings` HTTP 200。
- `/api/payment/linepay/status` 回傳 `configured`、`enabled`、`status`、`can_use_line_pay`。

## Economy v2 release gate

本機 foundation：

```bash
npm run test:economy-v2
git diff --check
```

標準：migration／RLS／grants／search path、台北日界、100 次冪等、100 路
扣點、20 路最後一件庫存、逾期 reservation 釋放、reversal、Auth staff
核銷與 default-off kill switch 全部通過。

Production 只讀 gate（不得省略 `--dry-run`）：

```bash
supabase migration list --linked
supabase db lint --linked --level error --fail-on error
supabase db push --dry-run
```

標準：linked ref 必須是 `xlqwfaailjyvsycjnzkz`；既有 local／remote history
一致；待套清單只能是 `20260715000000`–`20260715000005` 六項；不得包含
seed、roles、未知 migration。正式 `db push` 必須另取得當次明確授權。

Additive migration 後仍維持所有 flag 關閉。開啟 redeem canary 前，逐項
確認正式 `reward_items.stock_mode`／`reward_stock_buckets`、測試 reward 與
`staff_members` allowlist；不得把舊 inventory 自動當成 v2 可用庫存。

## Analytics / SEO smoke

本檢查不建立訂單、不觸發付款，只驗證 GA4 / Search Console / canonical / robots / JSON-LD 是否出現在可檢查的輸出中。

改版前後本機 build 後跑：

```bash
npm run build
npm run verify:analytics-seo -- --profile=local-build
```

部署後 production 跑：

```bash
npm run verify:analytics-seo -- --profile=production
```

標準：

- 首頁需有 canonical、GA4 `G-DM6F27KL8B`、Search Console verification、indexable robots、Bakery JSON-LD。
- Checkout 需維持 `noindex,nofollow`，避免被搜尋引擎收錄。
- `robots.txt` 需阻擋 query URL，避免 UTM URL 持續進入 index。
- 若 production profile 缺 canonical，但 local-build profile 通過，優先判定為 production 尚未部署最新 build。

## LINE Pay feature flag

LINE Pay 使用三段狀態：

| 狀態 | 前台一般客人 | 已登入後台的同瀏覽器 | API request |
|---|---|---|---|
| `hidden` | 不可見 | 不可見 | 拒絕新付款 request |
| `internal_test` | 不可見 | 可測 | admin session 可 request |
| `public` | 可見 | 可見 | 可 request |

驗證 hidden：

```bash
curl -sS -i -X POST https://shop.kiwimu.com/api/payment/linepay/request \
  -H 'Content-Type: application/json' \
  --data '{}'
```

標準：

- 若狀態是 `hidden`，應回 `403` 與 `LINE Pay 尚未公開` 類型訊息。
- 若狀態是 `public`，缺 `orderId` 應回 `400`。
- 若 LINE Pay env 未設定，應回 `503`。

驗證假訂單：

```bash
curl -sS -i -X POST https://shop.kiwimu.com/api/payment/linepay/request \
  -H 'Content-Type: application/json' \
  --data '{"orderId":"CODEX-LINEPAY-SMOKE-NOORDER","amount":1}'
```

標準：

- `public` 或 admin `internal_test` 狀態下，假訂單應回 `404 找不到訂單`。
- 不可觸發真實付款。

## LINE Pay 真實 E2E

需真人或內部測試者執行。未公告前不要長時間設為 `public`。

流程：

1. 後台付款設定確認 `methods.line_pay=true`。
2. 將 `line_pay_status` 設為 `internal_test`。
3. 同一瀏覽器保持 admin session。
4. 建立一筆內部測試訂單。
5. 在訂單成立頁點「使用 LINE Pay 付款」。
6. 完成 LINE Pay 付款。
7. 確認導回 `/order/success?orderId=...`。
8. 後台確認訂單狀態為 `paid`。
9. 確認 `linepay_transaction_id` 有寫入。
10. 確認通知、Email、Discord、n8n 不重複。

取消付款驗證：

1. 建立一筆內部測試訂單。
2. 進入 LINE Pay 後取消。
3. 確認導回 `/order/cancel?orderId=...`。
4. 確認訂單仍保留且未標記為 `paid`。

## Checkout smoke

人工或瀏覽器自動化驗證：

- 首頁載入。
- 加入商品至購物車。
- variant / 數量 / 金額正確。
- 優惠碼可套用與移除。
- checkout 表單必填驗證正常。
- 自取 / 宅配日期驗證正常。
- 建單成功。
- 銀行轉帳資訊顯示正確。
- 未公開 LINE Pay 時，客人看不到 LINE Pay 按鈕。

## Admin smoke

- 後台登入。
- 訂單列表載入。
- 訂單狀態更新。
- 菜單新增 / 編輯 / availability 切換。
- 優惠碼新增 / 編輯。
- Banner 新增 / 編輯。
- 付款設定可儲存。
- LINE Pay 公開狀態可在後台切換。

## 收工前

```bash
git status --short --branch
```

必要記錄：

- 改了哪些檔案。
- 跑了哪些 gate。
- 哪些測試還沒跑。
- 是否涉及 production env。
- 是否需要部署 / push。
