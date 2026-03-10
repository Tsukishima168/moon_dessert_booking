# BOOT.md — Moon Dessert Booking · 冷啟動快照

> 每次新開 Claude 對話，先讀這份文件。

---

## 冷啟動快照 · 2026-03-10 收工

### 今日完成
- Resend Email 串接（noreply@kiwimu.com）
- 訂單狀態自動通知（ready / cancelled）
- Email 模板 WYSIWYG + MOONMOON 風格
- 客戶分析展開個別客戶
- GA4 埋點（add_to_cart / begin_checkout）
- UTM 追蹤（ExploreMore.tsx 已修，utm_campaign=quiz_result）
- admin-polish：CSV 匯出 + 拖曳排序
- LINE Pay 架構預建（feat/linepay，Channel ID/Secret 待填）
- MBTI v2 路由（feat/mbti-v2，dev 狀態，勿 merge）

### 待主理人手動執行

1. **Supabase SQL migration：**
   ```sql
   ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS linepay_transaction_id TEXT;
   ```

2. **Vercel 環境變數：**
   | 變數 | 說明 |
   |------|------|
   | `LINEPAY_CHANNEL_ID` | LINE Pay Channel ID |
   | `LINEPAY_CHANNEL_SECRET` | LINE Pay Channel Secret |
   | `LINEPAY_API_URL` | `https://sandbox-api-pay.line.me`（測試）或 `https://api-pay.line.me`（正式）|

3. **GitHub PR：**
   `feat/admin-polish → main`
   https://github.com/Tsukishima168/moon_dessert_booking/compare/feat/admin-polish

4. **GA4 手動標記 5 個 Key Events：**
   - `begin_checkout`
   - `add_to_cart`
   - `quiz_completion`（MBTI）
   - `purchase`（待實作）
   - `linepay_confirm`（待實作）

5. **手測：** 訂單狀態改為「可取貨」→ 確認客戶收到 Email

### 待確認
- n8n 部署位置（本機 or 雲端？）→ 確認後才能測試訂單自動化觸發
- ManyChat LINE 連接（免費方案可做，待規劃）
- LINE Pay Channel ID/Secret（申請後填入 Vercel）

---

## 分支狀態

| 分支 | 狀態 | 說明 |
|------|------|------|
| `main` | ✅ Production | 穩定版，已部署 Vercel |
| `feat/admin-polish` | ⏳ 待 merge | CSV 匯出 + 菜單拖曳排序 |
| `feat/linepay` | 🔧 架構預建 | LINE Pay v3 路由（等 Channel ID）|
| `feat/resend-email` | ✅ 已 merge | Resend Email 串接 |
| `refactor/soc-phase1` | ✅ 已 merge | 三層架構重構 |

---

## 核心架構

```
Next.js App Router (Vercel)
├── app/
│   ├── admin/           ← 後台管理介面
│   │   ├── orders/      ← 訂單列表 + 編輯 + CSV 匯出
│   │   ├── menu/        ← 菜單管理（拖曳排序）
│   │   ├── campaigns/   ← 行銷活動 CRUD
│   │   └── marketing-automation/  ← 自動化規則 CRUD
│   └── api/
│       ├── order/       ← POST 建立訂單
│       ├── admin/       ← 後台 CRUD API
│       └── payment/
│           └── linepay/ ← LINE Pay v3（request / confirm）
├── lib/
│   ├── linepay.ts       ← LINE Pay v3 client + HMAC-SHA256
│   ├── supabase.ts      ← Supabase browser client
│   ├── supabase-server.ts
│   └── supabase-admin.ts
└── src/services/
    └── order.service.ts ← 訂單業務邏輯
```

## 外部整合

| 服務 | 狀態 | 說明 |
|------|------|------|
| **Supabase** | ✅ | 訂單、菜單、Banner、行銷資料 |
| **Vercel** | ✅ | 生產部署，環境變數已設定 |
| **Resend** | ✅ | noreply@kiwimu.com 郵件通知 |
| **Discord Webhook** | ✅ | #dessert-booking 頻道通知 |
| **N8N** | ⚠️ 待確認 | 本機 or 雲端部署未定 |
| **LINE Pay** | 🔧 架構完成 | 等 Channel ID/Secret 申請 |
| **GA4** | ✅ 埋點完成 | 5 個 Key Events 待手動標記 |
