# 🚀 快速開始 - 會員系統 & 郵件通知測試

*最後更新: 2026-03-06*

---

## ⚡ 5 分鐘快速檢查

### 1️⃣ 啟動開發服務器
```bash
cd /Users/pensoair/Desktop/網路開發專案/Dessert-Booking
npm run dev
```
訪問: http://localhost:3001

### 2️⃣ 測試會員登入
```
點擊 "登入會員" 或訪問 http://localhost:3001/auth/login
輸入測試郵箱: test@example.com
驗證 OTP (Supabase 會發送到郵箱或控制台)
應該跳轉到 http://localhost:3001/account
```

### 3️⃣ 驗證會員中心
```
✓ 頁面加載無誤
✓ 用戶名/郵箱/電話顯示正確
✓ "我的訂單" 列表顯示
✓ 登出按鈕可點擊
```

### 4️⃣ 測試郵件通知
```
1. 返回首頁 (http://localhost:3001)
2. 添加商品到購物車
3. 進入結帳頁面
4. 填寫訂單信息:
   - 姓名: 測試用戶
   - 郵箱: 您的真實郵箱
   - 電話: 0912345678
   - 取貨時間: 選擇明天
5. 點擊 "提交訂單"
6. 檢查郵件 (5-10 分鐘內)
   - 應收到確認郵件
   - 發件人: noreply@shop.kiwimu.com
   - 包含訂單編號
```

### 5️⃣ 驗證會員中心訂單
```
1. 登入會員帳戶 (使用剛才的郵箱)
2. 返回 /account
3. 新訂單應出現在列表
4. 點擊訂單查看詳情
```

---

## 🔧 常見問題排查

### ❌ 登入後仍在 /auth/login 頁面
**可能原因:** Supabase 認證失敗
```bash
# 檢查環境變數
cat .env.local | grep SUPABASE

# 應該看到:
NEXT_PUBLIC_SUPABASE_URL=https://xlqwfaailjyvsycjnzkz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ❌ 沒有收到郵件
**可能原因 1:** 郵件地址設置錯誤
```bash
# 檢查郵件配置
cat .env.local | grep RESEND

# 應該看到:
RESEND_API_KEY=re_QtTqqKYd_...
RESEND_FROM_EMAIL=noreply@shop.kiwimu.com
```

**可能原因 2:** 郵件被標記為垃圾
```
檢查垃圾郵件/促銷文件夾
將 noreply@shop.kiwimu.com 標記為信任
```

**可能原因 3:** Resend API 額度用完
```
登入 Resend 控制台檢查使用情況
免費版每月 100 封郵件
```

### ❌ 訂單 API 返回錯誤
**檢查日誌:**
```bash
# 開發服務器控制台應該顯示:
✓ createOrder() 成功
✓ sendCustomerEmail() 調用
✓ sendDiscordNotify() 調用
```

**若有錯誤:** 檢查 browser 開發工具 → Network → order API 響應

---

## 📋 SQL 遷移執行清單

### ✅ 準備工作
- [x] 3 個 SQL 腳本已準備
- [x] 位置: `/Users/pensoair/Desktop/網路開發專案/Dessert-Booking/scripts/`

### 🔴 待執行 (在 Supabase Dashboard 中)

**步驟:**
1. 登入 https://app.supabase.com
2. 選擇項目 "Dessert-Booking"
3. 左側欄 → SQL Editor → New query
4. 複製粘貼下列 SQL 文件，逐個執行

**文件 1: FIX_ORDERS_COLUMNS.sql**
```
目的: 添加訂單表缺失的列
時間: ~1 分鐘
風險: 低 (只添加新列和索引)
```

**文件 2: FIX_TIMEZONE_ISSUE.sql**
```
目的: 修復時區轉換函數
時間: ~1 分鐘
風險: 低 (修改現有函數邏輯)
```

**文件 3: CREATE_MENU_AVAILABILITY.sql**
```
目的: 創建菜單可用性系統
時間: ~1 分鐘
風險: 低 (創建新表和函數)
```

**執行後檢查:**
```sql
-- 驗證 orders 表新列
SELECT * FROM orders LIMIT 1;
-- 應包含: source_from, utm_source, user_id 等

-- 驗證函數
\df+ check_daily_capacity
\df+ can_order_item

-- 驗證表
SELECT * FROM menu_item_availability LIMIT 1;
```

---

## 📊 當前狀態檢查表

### 後端 API
- [x] `/api/order` - POST 訂單 (✅ 發送郵件)
- [x] `/api/user/orders` - GET 用戶訂單列表 (新增)
- [x] `/api/user/orders/[orderId]` - GET 訂單詳情 (新增)
- [ ] `/api/menu` - GET 菜單 (已存在，待 SQL 修復)
- [ ] `/api/promo` - 優惠碼驗證 (已存在)

### 前端頁面
- [x] `/` - 首頁商品列表
- [x] `/checkout` - 結帳頁面
- [x] `/auth/login` - 會員登入
- [x] `/account` - 會員中心 (新增)
- [x] `/account/order/[id]` - 訂單詳情 (新增)
- [ ] `/admin` - 行政後台 (已存在)

### 通知系統
- [x] Email (Resend) - 已修復 ✅
- [x] Discord - 已配置 (生產需檢查)
- [ ] LINE Notify - 備用 (可選)

### 數據庫
- [x] orders 表結構 - 待 SQL 修復 🔴
- [x] profiles 表 - ✅ 工作正常
- [x] menu_items 表 - ✅ 工作正常
- [ ] menu_item_availability 表 - 待 SQL 創建 🔴

---

## 🎯 驗證成功標誌

當以下全部完成時，表示實施成功:

✨ **會員系統**
- [x] 用戶可登入會員帳戶
- [x] 會員中心頁面存在
- [x] 可查看訂單列表
- [x] 可查看訂單詳情
- [ ] 實際測試通過

✨ **郵件通知**
- [x] 環境變數配置正確
- [x] 郵件函數已實現
- [x] 訂單 API 調用郵件函數
- [ ] 實際郵件到達

✨ **後端完整性**
- [x] 核心 API 已實現
- [x] 認證層完善
- [ ] SQL 遷移已執行
- [ ] 菜單系統完整

---

## 📝 測試用例

### 用例 1: 新用戶訂購流程
```
步驟:
1. 訪問 http://localhost:3001
2. 添加 2-3 種商品到購物車
3. 點擊結帳
4. 填寫信息:
   姓名: 新用戶測試
   郵箱: new@example.com
   電話: 0987654321
   取貨時間: 明天 14:00
5. 提交訂單

驗證:
✓ API 返回訂單 ID
✓ 頁面顯示成功消息
✓ 5-10 分鐘內收到郵件
```

### 用例 2: 已登入用戶訂購流程
```
步驟:
1. 訪問 /auth/login，登入已有帳戶
2. 跳轉到 /account
3. 返回首頁 (/)
4. 重複用例 1 的步驟 2-5

驗證:
✓ 訂單自動關聯用戶 ID
✓ 返回 /account 時新訂單即時顯示
✓ 訂單詳情頁面完整
```

### 用例 3: 會員訂單查詢
```
步驟:
1. 登入會員帳戶
2. 訪問 /account
3. 點擊任一訂單

驗證:
✓ 訂單詳情頁面加載
✓ 所有信息正確顯示
✓ 返回按鈕跳轉回會員中心
```

---

## 🔐 安全檢查

### 認證驗證
- [x] 會員中心需要登入
- [x] 用戶只能查看自己的訂單
- [x] API 驗證用戶身份
- [x] 登出後無法訪問

### 數據隱私
- [x] 訂單信息包含敏感數據 (email, phone, address)
- [ ] API 響應是否洩露其他用戶信息？
- [ ] RLS 政策是否正確？

### 注入攻擊防護
- [x] API 使用 Supabase 參數化查詢
- [x] 表單輸入已驗證
- [ ] SQL 函數是否安全？

---

## 📞 快速聯絡

**如遇問題，檢查:**

1. **環境變數** - `.env.local` 是否完整？
2. **服務器狀態** - `npm run dev` 是否成功啟動？
3. **Supabase 狀態** - https://status.supabase.com
4. **Resend 狀態** - https://status.resend.com
5. **網絡連接** - VPN/防火牆是否擋住 API？

**查看日誌:**
```bash
# 開發服務器日誌
# → 終端窗口顯示 error/warn 消息

# Browser 控制台
# → F12 → Console / Network 標籤

# Supabase 日誌
# → Dashboard → Logs → API / Auth / Realtime
```

---

## ✅ 後續行動清單

### 今天 (立即)
- [ ] 運行 `npm run dev` 啟動開發服務器
- [ ] 測試會員登入和會員中心
- [ ] 提交測試訂單並驗證郵件
- [ ] 檢查是否有 TypeScript 編譯錯誤

### 本周
- [ ] 在 Supabase 執行 3 個 SQL 遷移腳本
- [ ] 完整端到端流程測試
- [ ] 修複發現的問題
- [ ] 準備 Vercel 預生產部署

### 下周
- [ ] 性能測試
- [ ] 安全審計
- [ ] 用戶驗收測試 (UAT)
- [ ] 生產環境上線

---

*此指南幫助您快速驗證實施狀態。如有疑問，參考完整文檔:*
- 📖 [`IMPLEMENTATION_SUMMARY_2026-03-06.md`](IMPLEMENTATION_SUMMARY_2026-03-06.md)
- 📖 [`TESTING_PLAN_2026-03-06.md`](TESTING_PLAN_2026-03-06.md)
- 📖 [`REPAIR_PLAN_2026-03-06.md`](REPAIR_PLAN_2026-03-06.md)
