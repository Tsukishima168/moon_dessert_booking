# 會員系統測試計劃 (2026-03-06)

## 問題檢查清單

### ✅ 問題 1: 會員登入後需要會員中心看自己的訂單
**狀態**: 已實現
- [x] 創建 `/app/account/page.tsx` - 會員中心頁面
- [x] 創建 `/app/api/user/orders/route.ts` - 獲取用戶訂單列表
- [x] 創建 `/app/api/user/orders/[orderId]/route.ts` - 獲取單個訂單詳情
- [x] 在 `/app/api/order/route.ts` 添加服務端 Supabase 認證，自動捕捉當前用戶 ID
- [x] 配置郵件發送地址 `RESEND_FROM_EMAIL=noreply@shop.kiwimu.com`

**實現細節**:
```
會員登入流程:
/app/auth/login/page.tsx → Supabase OTP 登入
↓
/app/account/page.tsx → 會員中心
  ├─ 用戶個人資料卡片 (頭像、姓名、郵件、電話、加入日期)
  ├─ 訂單列表 (狀態徽章、商品、金額、取貨時間)
  └─ 登出按鈕

訂單關聯:
新訂單 (user_id = null) → /account → API 自動關聯 user_id
新訂單 (已登入) → /account → 檢索該用戶所有訂單
```

---

### 🔄 問題 2: 下單後 Email 沒有收到通知
**狀態**: 配置已修復，需驗證
- [x] 設置 `RESEND_API_KEY=re_QtTqqKYd_...` (已有)
- [x] 設置 `RESEND_FROM_EMAIL=noreply@shop.kiwimu.com` (已修復)
- [x] 驗證 `/lib/notifications.ts` 中 `sendCustomerEmail()` 函數
- [x] 驗證 `/app/api/order/route.ts` 調用郵件發送函數
- [ ] **待測試**: 提交一個測試訂單，確認郵件到達

**郵件發送流程**:
```
POST /api/order
  ↓
createOrder() 成功
  ↓
Promise.all([
  sendCustomerEmail() → Resend API
  sendDiscordNotify() → Discord Webhook
  notifyNewOrder() → LINE Notify 或其他
])
```

**可能的問題排查**:
- [ ] RESEND_API_KEY 是否有效？
- [ ] 目標郵箱地址是否正確？
- [ ] 是否被郵件提供商（Gmail、Outlook）標記為垃圾？
- [ ] Resend API 是否在請求限制內？

---

### 🔄 問題 3: 後端很多功能無法啟用，請處理完整
**狀態**: 4 階段修復計劃進行中

#### 第一階段 ✅ 郵件配置 (已完成)
- [x] RESEND_FROM_EMAIL 設置

#### 第二階段 ✅ 會員系統 (已完成)
- [x] 會員中心頁面
- [x] 訂單查詢 API
- [x] 用戶認證中間件

#### 第三階段 🔄 SQL 遷移腳本 (待執行)
**需要在 Supabase Dashboard 執行以下 SQL**:
1. **scripts/FIX_ORDERS_COLUMNS.sql**
   - 添加缺失列: source_from, utm_source, utm_medium, utm_campaign, utm_content, utm_term, user_id
   - 添加索引用於性能
   
2. **scripts/FIX_TIMEZONE_ISSUE.sql**
   - 修復 check_daily_capacity() 函數中的時區轉換問題
   - 確保菜單項可用性檢查正確
   
3. **scripts/CREATE_MENU_AVAILABILITY.sql**
   - 創建 menu_item_availability 表
   - 創建 RPC 函數: can_order_item()

**執行方式**:
```bash
# 在 Supabase Dashboard → SQL Editor 中
# 複製粘貼每個 SQL 文件內容並執行
```

#### 第四階段 🔄 功能驗證 (待開始)
- [ ] 全流程訂購測試 (商品選擇 → 結帳 → 支付 → 郵件 → Discord → 會員中心)
- [ ] 菜單可用性系統測試 (黑名單日期、週期限制)
- [ ] 圖片上傳功能測試 (Cloudinary CDN)
- [ ] 行政後台功能測試 (訂單管理、統計報告、設置)
- [ ] 性能測試 (RLS 策略、查詢優化)

---

## 快速驗證步驟

### 1️⃣ 測試會員中心頁面
```
步驟:
1. npm run dev (開發服務器)
2. 訪問 http://localhost:3001
3. 點擊 "登入會員" 或導航到 /auth/login
4. 輸入測試郵箱 + 收取 OTP
5. 登入後應重定向到 /account
6. 檢查:
   - ✓ 用戶信息正確顯示？
   - ✓ 訂單列表加載？
   - ✓ 狀態徽章顯示正確？
   - ✓ 登出按鈕工作？
```

### 2️⃣ 測試郵件通知
```
步驟:
1. 在結帳頁面填寫測試訂單
2. 郵箱: test@example.com (或自己的郵箱)
3. 提交訂單
4. 檢查:
   - ✓ API 返回成功 (HTTP 200)?
   - ✓ Discord 收到通知？
   - ✓ 5-10 分鐘內收到郵件？
   - ✓ 郵件主題和內容正確？
```

### 3️⃣ 執行 SQL 遷移
```
步驟:
1. 登入 Supabase Dashboard
2. 轉到 SQL Editor
3. 粘貼 scripts/FIX_ORDERS_COLUMNS.sql 並執行
4. 粘貼 scripts/FIX_TIMEZONE_ISSUE.sql 並執行
5. 粘貼 scripts/CREATE_MENU_AVAILABILITY.sql 並執行
6. 檢查:
   - ✓ 沒有 SQL 錯誤？
   - ✓ 表和列創建成功？
   - ✓ 函數定義成功？
```

### 4️⃣ 完整流程測試
```
訂單 → 郵件 → 會員中心:
1. 登入會員帳戶
2. 添加商品到購物車
3. 提交訂單
4. 檢查郵件是否已發送
5. 返回 /account 會員中心
6. 驗證新訂單是否出現在訂單列表
```

---

## 環境檢查清單

### 已配置 ✅
- [x] SUPABASE_URL + ANON_KEY (用於客戶端)
- [x] SUPABASE_SERVICE_ROLE_KEY (用於服務端)
- [x] RESEND_API_KEY (郵件服務)
- [x] RESEND_FROM_EMAIL (郵件發件人)
- [x] DISCORD_WEBHOOK_URL (Discord 通知) - *待確認生效*
- [x] CLOUDINARY_* (圖片 CDN)
- [x] 銀行匯款信息 (BANK_NAME, BANK_ACCOUNT 等)
- [x] 店鋪信息 (STORE_NAME, STORE_PHONE 等)

### 待驗證 ⚠️
- [ ] DISCORD_WEBHOOK_URL 是否在 Vercel 環境變數中設置？
- [ ] Resend 郵件模板是否通過審核？
- [ ] 菜單項圖片是否都上傳到 Cloudinary？

---

## 代碼變更摘要

### 新建文件
- `/app/account/page.tsx` - 會員中心主頁
- `/app/api/user/orders/route.ts` - 用戶訂單列表 API
- `/app/api/user/orders/[orderId]/route.ts` - 訂單詳情 API
- `/REPAIR_PLAN_2026-03-06.md` - 修復計劃文檔
- `/TESTING_PLAN_2026-03-06.md` - 此文件

### 修改文件
- `/app/api/order/route.ts` - 添加服務端 Supabase 認證，自動捕捉用戶 ID
- `/.env.local` - 設置 RESEND_FROM_EMAIL

### SQL 腳本 (待執行)
- `scripts/FIX_ORDERS_COLUMNS.sql`
- `scripts/FIX_TIMEZONE_ISSUE.sql`
- `scripts/CREATE_MENU_AVAILABILITY.sql`

---

## 成功指標

✨ 當以下條件全部滿足時，問題解決:

1. **會員系統** 🏠
   - [ ] 用戶可以登入會員帳戶
   - [ ] 會員中心顯示用戶信息
   - [ ] 會員中心顯示該用戶所有訂單
   - [ ] 訂單狀態徽章正確顯示
   - [ ] 用戶可以查看訂單詳情

2. **郵件通知** 📧
   - [ ] 客戶提交訂單後收到確認郵件
   - [ ] 郵件內容包含訂單編號、商品、金額
   - [ ] 郵件發件人為 noreply@shop.kiwimu.com
   - [ ] 郵件未被標記為垃圾郵件

3. **後端功能** ⚙️
   - [ ] 所有 3 個 SQL 遷移腳本成功執行
   - [ ] orders 表包含所有必需列
   - [ ] menu_item_availability 系統工作正常
   - [ ] check_daily_capacity() 函數返回正確結果
   - [ ] 用戶 ID 正確關聯到訂單

4. **集成測試** 🧪
   - [ ] 完整訂購流程不出錯
   - [ ] Discord 通知成功發送
   - [ ] 訂單在會員中心實時顯示
   - [ ] 沒有 TypeScript 編譯錯誤
   - [ ] 沒有 API 運行時錯誤

---

## 下一步行動

### 立即執行
1. 運行 `npm run dev` 在 localhost:3001 測試會員中心
2. 提交一個測試訂單並檢查郵件
3. 在 Supabase Dashboard 執行 3 個 SQL 腳本

### 預期所需時間
- 會員系統測試: 5-10 分鐘
- 郵件通知測試: 10-15 分鐘
- SQL 遷移: 5 分鐘
- 完整流程測試: 15-20 分鐘

**總計: 約 35-50 分鐘 ⏱️**

---

*最後更新: 2026-03-06*
*下一步: 根據測試結果調整代碼並部署到 Vercel*
