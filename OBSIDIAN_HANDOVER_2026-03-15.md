# Dessert-Booking 交接快照 2026-03-15

> **Obsidian 同步用** — 複製此文件到 `Penso-OS/08_專案工坊/Subdomain_shop.kiwimu.com/` 即可

---

## 專案狀態

| 項目 | 狀態 |
|------|------|
| **專案名稱** | Moon Dessert Booking (月島甜點) |
| **網址** | shop.kiwimu.com |
| **Repo** | Tsukishima168/moon_dessert_booking |
| **主分支** | `main` — Production (Vercel 部署中) |
| **整體完成度** | 85% |
| **上次更新** | 2026-03-15 |

---

## 分支狀態

| 分支 | 狀態 | 說明 |
|------|------|------|
| `main` | ✅ Production | 穩定版，已部署 Vercel |
| `feat/admin-polish` | ✅ 已 merge (PR #5) | CSV 匯出 + 菜單拖曳排序 + Line Pay 對帳 + 訂單時間軸 |
| `feat/linepay` | 🔧 架構預建 | LINE Pay v3 路由（等 Channel ID/Secret） |
| `feat/resend-email` | ✅ 已 merge | Resend Email 串接 |
| `refactor/soc-phase1` | ✅ 已 merge | 三層架構重構 + RWD 修復 |
| `feat/mbti-v2` | 🚧 開發中 | MBTI v2 路由（勿 merge） |

---

## 最近完成的工作 (3/6 ~ 3/15)

### PR #5: feat/admin-polish (已 merge 3/13)
- 訂單 CSV 匯出 + 菜單商品拖曳排序
- 訂單通知鏈檢查面板 + 手動重送
- 訂單活動時間軸
- Line Pay 對帳資訊 + 後台回填交易號
- 訂單列表對帳篩選
- Order interface email 欄位修復
- 訂單狀態更新流程收斂

### PR #6: test coverage analysis (已 merge 3/15)
- 完整測試覆蓋率分析報告
- 6 階段實施路線圖 (~105 個測試)
- 建議使用 Vitest + React Testing Library

### 更早完成 (3/6 ~ 3/10)
- Resend Email 串接 (noreply@kiwimu.com)
- 訂單狀態自動通知 (ready/cancelled)
- Email 模板 WYSIWYG + MOONMOON 風格
- GA4 埋點 (add_to_cart / begin_checkout)
- UTM 追蹤
- EventBus N8N Webhook 重新集成
- Shop 前台 RWD 修復 (375px, 12 個問題)
- 會員中心系統 + 訂單查詢 API
- 郵件通知修復

---

## 技術架構

```
Stack: Next.js 14 + TypeScript + Supabase + Vercel
架構: 3-Tier (Route → Service → Repository) + EventBus

app/
├── admin/           ← 後台管理介面
│   ├── orders/      ← 訂單列表 + 編輯 + CSV 匯出
│   ├── menu/        ← 菜單管理（拖曳排序）
│   ├── campaigns/   ← 行銷活動 CRUD
│   └── marketing-automation/
├── account/         ← 會員中心 + 訂單查詢
├── api/
│   ├── order/       ← POST 建立訂單
│   ├── admin/       ← 後台 CRUD API
│   └── payment/linepay/  ← LINE Pay v3
└── auth/            ← 登入/登出

src/services/        ← 業務邏輯層
src/repositories/    ← 資料存取層
src/lib/event-bus.ts ← 事件驅動
```

---

## 外部服務整合

| 服務 | 狀態 | 說明 |
|------|------|------|
| Supabase | ✅ 運行中 | 訂單/菜單/Banner/行銷資料 (17+ 表) |
| Vercel | ✅ 部署中 | 生產環境 |
| Resend | ✅ 已串接 | noreply@kiwimu.com 郵件通知 |
| Discord Webhook | ✅ 已串接 | #dessert-booking 頻道通知 |
| Cloudinary | ✅ 已串接 | 圖片 CDN |
| GA4 | ✅ 埋點完成 | G-DM6F27KL8B，5 Key Events 待手動標記 |
| N8N | ⚠️ 待確認 | 本機 or 雲端部署未定 |
| LINE Pay | 🔧 架構完成 | 等 Channel ID/Secret |
| ManyChat | 📋 Free 方案 | 401 Subscribers，LINE 未連線 |

---

## 待主理人執行

### 🔴 高優先

1. **SQL Migration** — Supabase SQL Editor 執行：
   ```sql
   ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS linepay_transaction_id TEXT;
   ```
   另外還有 3 個腳本待執行：
   - `scripts/FIX_ORDERS_COLUMNS.sql`
   - `scripts/FIX_TIMEZONE_ISSUE.sql`
   - `scripts/CREATE_MENU_AVAILABILITY.sql`

2. **手測** — 訂單狀態改為「可取貨」→ 確認客戶收到 Email

3. **GA4** — 手動標記 5 個 Key Events：
   - `begin_checkout`, `add_to_cart`, `quiz_completion`, `purchase`(待實作), `linepay_confirm`(待實作)

### 🟠 中優先

4. **LINE Pay** — 申請後填入 Vercel 環境變數：
   - `LINEPAY_CHANNEL_ID`
   - `LINEPAY_CHANNEL_SECRET`
   - `LINEPAY_API_URL`

5. **N8N** — 決定部署位置（本機 or 雲端），確認 webhook 串接

6. **ManyChat** — LINE 連線規劃

---

## 測試現況

- **自動化測試：0** — 目前無測試框架
- 已完成測試覆蓋率分析 (TEST_COVERAGE_ANALYSIS.md)
- 建議框架：Vitest + React Testing Library + MSW
- 路線圖：6 階段，~105 個測試，從 cartStore + EventBus 開始

---

## 待開發功能 (達到 95%)

| 功能 | 預估時間 | 優先級 |
|------|---------|-------|
| 優惠碼系統完善 | 30 分鐘 | 🔴 高 |
| 行銷活動系統 | 2 小時 | 🔴 高 |
| 橫幅管理系統 | 1 小時 | 🔴 高 |
| 推送模板系統 | 1.5 小時 | 🟠 中 |
| 自動化行銷規則 | 1.5 小時 | 🟠 中 |
| 測試框架建立 (Phase 1) | 2 小時 | 🟠 中 |
| 支付系統集成 (綠界/Stripe) | TBD | 🟡 低 |
| 訂單狀態實時更新 (WebSocket) | TBD | 🟡 低 |

---

## 關鍵文件索引

| 文件 | 用途 |
|------|------|
| `BOOT.md` | 冷啟動快照，新對話先讀 |
| `AI_CONTEXT.md` | 專案概述 + 架構原則 |
| `AI_HANDOVER.md` | 2026-03-10 交接文件 |
| `AI_交接日誌_COPY.md` | 完整開發日誌 (3/6~3/8) |
| `TEST_COVERAGE_ANALYSIS.md` | 測試覆蓋率分析 + 路線圖 |
| `PROJECT_PROGRESS.md` | Obsidian 同步鏡像 |
| `HANDOVER_2026-03-06.md` | 會員系統交接文檔 |
| `docs/` | 各模組詳細文檔 |
| `scripts/` | SQL 遷移腳本 |

---

## Obsidian 同步區塊

```yaml
sync_id: dessert_booking
project_name: Dessert-Booking
project_status: 🟢 已上線，持續優化中
last_synced: 2026-03-15T12:00:00+08:00
repo_branch: main
repo_last_commit: d1b3653 Merge PR #6 test coverage analysis
next_action: LINE Pay 金鑰填入 / GA4 Key Events 標記 / n8n 部署決策
completion: 85%
```

---

*Generated: 2026-03-15 by Claude Opus — for Obsidian handover sync*
