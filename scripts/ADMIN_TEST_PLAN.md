# 🎯 後台管理系統 - 完整測試計畫

> 編寫時間: 2026-03-05 | 前端: ✅ 完成 | 後台: 🟡 進行中

## 前置作業

### Step 1: 執行 SQL 修復腳本（**必須先執行**）
進入 Supabase Dashboard → SQL Editor，按順序執行：

1. **FIX_ORDERS_COLUMNS.sql**
   - 添加缺失的 6 列：`source_from`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `user_id`
   - ⏱ 1 分鐘

2. **FIX_TIMEZONE_ISSUE.sql**
   - 重寫 `check_daily_capacity()` RPC 函數，修復時區轉換
   - ⏱ 2 分鐘

### Step 2: 重啟開發服務器
```bash
npm run dev
```
應該在 localhost:3001 啟動

---

## 完整測試套件（30+ 檢查點）

### 📋 Phase 1: 菜單管理 (Menu Admin)

#### 1.1 菜單查詢與篩選
- [ ] 加載頁面時顯示所有菜單項目（應有 36 個）
- [ ] 搜尋功能 - 輸入商品名稱（如 "巧克力"）篩選結果
- [ ] 分類篩選 - 選擇不同分類（如 "甜點", "飲品"），顯示對應項目
- [ ] 清除篩選 - 重置搜尋和分類後恢復全部顯示

#### 1.2 菜單項目 CRUD
- [ ] **新增菜單** - 點擊「新增菜單」，填入資訊並保存
  - 名稱、分類、價格、描述、圖片 URL
  - 變種（如：小杯 $30、大杯 $40）
- [ ] **編輯菜單** - 點擊項目的編輯按鈕，修改資訊後保存
- [ ] **刪除菜單** - 點擊刪除按鈕，確認後刪除（應有確認提示）
- [ ] **狀態切換** - 切換 `is_active` 和 `recommended` 開關

#### 1.3 🎨 圖片上傳功能（**新功能**）
- [ ] 點擊「上傳圖片」按鈕打開文件選擇器
- [ ] 選擇 JPG/PNG 圖片，自動上傳至 Cloudinary
- [ ] 上傳完成後，圖片 URL 自動填入文字框
- [ ] 顯示圖片預覽（20×20 縮圖）
- [ ] 上傳失敗時顯示錯誤訊息
- [ ] 仍可手動貼上 Cloudinary URL

#### 1.4 變種管理
- [ ] 菜單項目列表顯示變種數量（如 "2 個變種"）
- [ ] 點擊展開顯示變種詳情（名稱、價格）
- [ ] 編輯時可修改變種名稱和價格
- [ ] 編輯時可新增/刪除變種

#### 1.5 拖放排序（Drag-Drop）
- [ ] 在列表中拖放菜單項目改變順序
- [ ] 鬆開滑鼠時自動保存新順序
- [ ] 頁面刷新後仍保持新順序

---

### 📦 Phase 2: 訂單管理 (Orders)

#### 2.1 訂單儀表板
- [ ] 加載頁面時顯示訂單統計
  - 今日訂單數
  - 待確認訂單數
  - 總收益（應計算所有訂單的 total_price）
- [ ] 顯示訂單狀態分布（待確認、準備中、已完成）

#### 2.2 訂單篩選與搜尋
- [ ] 按狀態篩選 - 顯示特定狀態的訂單
- [ ] 按日期篩選 - 選擇日期範圍查看訂單
- [ ] 搜尋客戶 - 輸入客戶名稱或電話號碼
- [ ] 排序 - 按日期、金額排序

#### 2.3 訂單詳情
- [ ] 點擊訂單顯示完整資訊
  - 客戶名稱、電話、電郵
  - 取餐時間、配送地址
  - 訂購項目及數量
  - UTM 來源信息（source_from, utm_* 等）

#### 2.4 訂單狀態管理（拖放）
- [ ] 右側顯示狀態列（待確認、準備中、已完成、已取消）
- [ ] 將訂單卡片拖放到不同狀態列更新狀態
- [ ] 狀態變更應實時保存到數據庫
- [ ] 頁面刷新後狀態仍保持

#### 2.5 訂單通知
- [ ] 狀態更新時是否發送通知（Discord/Email）
- [ ] 驗證 Discord webhook 是否工作（如已設定）
- [ ] 驗證電郵通知是否發送（Resend API）

---

### 💳 Phase 3: 優惠券管理 (Promo Codes)

#### 3.1 優惠券列表
- [ ] 加載時顯示所有優惠券
- [ ] 顯示優惠券代碼、折扣、使用次數、有效期
- [ ] 搜尋優惠券（按代碼）

#### 3.2 優惠券 CRUD
- [ ] **新增優惠券** - 輸入代碼、折扣類型（固定金額/百分比）、限制條件
- [ ] **編輯優惠券** - 修改優惠券設定
- [ ] **刪除優惠券** - 移除優惠券
- [ ] **啟用/禁用** - 切換優惠券狀態

#### 3.3 優惠券驗證（訂單流程）
- [ ] 在 checkout 頁面輸入有效優惠券代碼，確認折扣應用
- [ ] 輸入無效代碼時顯示錯誤
- [ ] 優惠券使用次數超限時無法使用

---

### 🎪 Phase 4: Banner 管理

#### 4.1 Banner 列表
- [ ] 加載時顯示所有 Banner（包括標題、優先級、狀態）
- [ ] 按優先級排序（數字越小優先級越高）

#### 4.2 Banner CRUD
- [ ] **新增 Banner** - 輸入標題、描述、背景色、連結 URL、按鈕文字
- [ ] **編輯 Banner** - 修改 Banner 設定
- [ ] **刪除 Banner** - 移除 Banner
- [ ] **啟用/禁用** - 切換 Banner 顯示狀態

#### 4.3 Banner 樣式
- [ ] 選擇背景色（color picker）後預覽更新
- [ ] 選擇文字色後預覽更新
- [ ] 設定優先級控制顯示順序

#### 4.4 Banner 時間範圍
- [ ] 設定 start_date 和 end_date，指定 Banner 顯示期間
- [ ] 在指定時間範圍外，Banner 不應顯示（驗證於前台首頁）

---

### 📊 Phase 5: 業務設定與統計

#### 5.1 業務設定 (Business Settings)
- [ ] 加載頁面顯示現有設定
  - 取餐時間設定
  - 每日容量限制
  - 配送方式
- [ ] 編輯設定並保存
- [ ] 設定後立即生效

#### 5.2 訂單統計
- [ ] 今日/週/月訂單統計
- [ ] 按配送方式統計訂單數
- [ ] 按菜單項目統計銷售數量
- [ ] 銷售額趨勢圖表（如有實現）

#### 5.3 日期容量檢查
- [ ] API `/api/check-capacity?date=2026-03-10` 返回正確結果
  - 應包含 `available_slots`, `daily_limit`, `current_capacity`
- [ ] 前台 checkout 頁面根據容量提示日期是否可預訂

---

### 🔐 Phase 6: 安全性與認證

#### 6.1 管理員認證
- [ ] 未登入時訪問 `/admin` 重定向到登入頁面
- [ ] 輸入正確管理員密碼 (`admin123`) 登入成功
- [ ] 輸入錯誤密碼無法登入
- [ ] 登出後無法訪問管理頁面

#### 6.2 RLS 安全性（數據庫級）
- [ ] 匿名用戶能提交訂單（前台購物流程）
- [ ] 匿名用戶無法訪問管理員端點（如 `/api/admin/menu`）
- [ ] 認證用戶無法修改其他用戶的訂單（如適用）

---

### 🚀 Phase 7: API 端點驗證

#### 7.1 菜單 API
```bash
curl http://localhost:3001/api/menu
```
- [ ] 返回狀態碼 200
- [ ] 返回 36 個菜單項目的 JSON 陣列
- [ ] 每個項目包含 `image_url` 指向有效的 Cloudinary URL

#### 7.2 容量檢查 API（修復後）
```bash
curl 'http://localhost:3001/api/check-capacity?date=2026-03-10'
```
- [ ] 返回狀態碼 200（**之前失敗，現在應修復**）
- [ ] 返回 JSON：`{ available_slots, daily_limit, current_capacity }`
- [ ] 日期格式支持 YYYY-MM-DD

#### 7.3 訂單 API（修復後）
```bash
curl -X POST http://localhost:3001/api/order \
  -H 'Content-Type: application/json' \
  -d '{
    "customer_name": "Test User",
    "phone": "0912345678",
    "email": "test@example.com",
    "pickup_time": "2026-03-10 14:00",
    "items": [{"menu_id": "item-1", "quantity": 2}],
    "total_price": 100,
    "delivery_method": "pickup"
  }'
```
- [ ] 返回狀態碼 200（**之前失敗：缺少 source_from 列，現在應修復**）
- [ ] 返回 JSON：`{ success: true, order_id: "ORD..." }`

#### 7.4 圖片上傳 API
```bash
curl -X POST http://localhost:3001/api/admin/upload \
  -F 'file=@/path/to/image.jpg' \
  -F 'folder=moon-dessert/menu'
```
- [ ] 返回狀態碼 200
- [ ] 返回 JSON：`{ success: true, url: "https://res.cloudinary.com/...", public_id: "..." }`
- [ ] 上傳的圖片應在 Cloudinary 儀表板可見

---

## 測試順序建議

1. **執行 SQL 修復**（3 分鐘）
2. **API 端點驗證**（Phase 7: 5 分鐘）
3. **菜單管理**（Phase 1: 10 分鐘）
4. **訂單管理**（Phase 2: 10 分鐘）
5. **其他模組**（Phase 3-6: 15 分鐘）

**總耗時**：約 45 分鐘

---

## 常見問題排查

| 問題 | 解決方案 |
|------|--------|
| 404 Not Found | 確認開發服務器運行在 localhost:3001 |
| CORS 錯誤 | 檢查 `.env.local` 中的 CLOUDINARY_* 環境變數 |
| 上傳失敗 | 驗證 CLOUDINARY_API_SECRET 配置正確 |
| 訂單提交失敗 | 確認已執行 FIX_ORDERS_COLUMNS.sql |
| 日期容量查詢失敗 | 確認已執行 FIX_TIMEZONE_ISSUE.sql 並重啟服務 |
| 圖片 URL 無效 | Cloudinary 圖片應為 `https://res.cloudinary.com/dvizdsv4m/...` |

---

## 成功標誌

✅ 所有 30+ 檢查點完成  
✅ API 端點全部返回 200 狀態碼  
✅ 前後端流程連貫（訂購 → 管理 → 確認）  
✅ 無 TypeScript/ESLint 錯誤  
✅ 圖片上傳正常工作  
✅ 準備生產部署

