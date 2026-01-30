# 📦 訂單流程說明

## 🔄 訂單資料流向

### 1. **客戶下單**
客戶在網站上完成訂單後，資料會依以下流程處理：

```
客戶填寫表單
    ↓
前端驗證
    ↓
POST /api/order
    ↓
儲存到 Supabase
    ↓
發送通知（Email + LINE）
    ↓
返回訂單編號給客戶
```

---

## 🗄️ 訂單資料儲存位置

### Supabase 資料表：`orders`

所有訂單都儲存在 Supabase 的 `orders` 資料表中。

#### 資料表欄位：

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID | 系統內部 ID |
| `order_id` | TEXT | 訂單編號（顯示給客戶） |
| `customer_name` | TEXT | 客戶姓名 |
| `phone` | TEXT | 聯絡電話 |
| `email` | TEXT | Email（選填） |
| `pickup_time` | TEXT | 取貨時間 |
| `items` | JSONB | 訂購商品（JSON 格式） |
| `total_price` | NUMERIC | 訂單總金額 |
| `original_price` | NUMERIC | 原價（使用優惠碼時） |
| `discount_amount` | NUMERIC | 折扣金額 |
| `final_price` | NUMERIC | 最終金額 |
| `promo_code` | TEXT | 優惠碼 |
| `status` | TEXT | 訂單狀態（pending/confirmed/completed/cancelled） |
| `payment_date` | TEXT | 預計轉帳日期 |
| `mbti_type` | TEXT | MBTI 類型（如果來自測驗） |
| `from_mbti_test` | BOOLEAN | 是否來自 MBTI 測驗 |
| `created_at` | TIMESTAMP | 建立時間 |

---

## 📊 如何查看訂單

### 方法 1：Supabase Dashboard（推薦）

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 點擊 **Table Editor**
4. 選擇 `orders` 資料表
5. 查看所有訂單

**排序建議：** 點擊 `created_at` 欄位，按時間排序（最新在上）

### 方法 2：SQL 查詢

```sql
-- 查看最近 10 筆訂單
SELECT 
  order_id,
  customer_name,
  phone,
  email,
  total_price,
  promo_code,
  discount_amount,
  payment_date,
  status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

### 方法 3：匯出為 CSV

1. 在 Table Editor 中
2. 點擊右上角的 **Export**
3. 選擇 **Download as CSV**
4. 可在 Excel 或 Google Sheets 中查看

---

## 🔔 訂單通知

### 客戶通知（Email）

如果客戶提供 Email，系統會自動發送確認信：

**內容包含：**
- 🌙 品牌 Logo
- 📋 訂單編號
- 💰 訂單金額（含優惠碼折扣）
- 🕐 取貨時間
- 📦 商品明細
- 💳 匯款資訊（銀行帳號）
- 📅 預計轉帳日期
- 📞 聯絡資訊

### 店家通知（LINE Notify）

每筆新訂單都會發送 LINE 通知給您：

**內容包含：**
```
🎉 新訂單通知！

訂單編號：ORD1738012345678
客戶姓名：王小明
聯絡電話：0912345678
🎫 優惠碼：SAVE20 (-$100)
💵 原價：$500
💰 訂購金額：$400
📅 預計轉帳：2026-01-30
取貨時間：2026-02-01 14:00-15:00

商品明細：
  • 提拉米蘇 (6吋) x1
  • 檸檬塔 x2

請準備商品 🍰
```

---

## 💳 轉帳流程

### 1. **客戶選擇轉帳日期**

在結帳頁面，客戶需要選擇「預計轉帳日期」：

```
┌─────────────────────────────────────┐
│ 💳 預計轉帳日期 *                   │
├─────────────────────────────────────┤
│ [2026-02-01      ]                  │
│                                     │
│ 請選擇您預計完成轉帳的日期，        │
│ 方便我們追蹤訂單狀態                │
└─────────────────────────────────────┘
```

### 2. **客戶收到匯款資訊**

Email 確認信中會包含完整的銀行帳號資訊（來自 `.env.local`）：

```
💳 匯款資訊
銀行名稱：Line Bank
銀行代碼：824
分行：總行
帳號：111007479473
戶名：您的名字
```

### 3. **店家追蹤轉帳狀態**

您可以在 Supabase 中查看：
- 哪些訂單預計今天轉帳
- 哪些訂單已逾期未轉帳

**SQL 查詢：**
```sql
-- 今天預計轉帳的訂單
SELECT order_id, customer_name, phone, total_price, payment_date
FROM orders
WHERE payment_date = CURRENT_DATE
  AND status = 'pending'
ORDER BY created_at;

-- 逾期未轉帳的訂單
SELECT order_id, customer_name, phone, total_price, payment_date
FROM orders
WHERE payment_date < CURRENT_DATE
  AND status = 'pending'
ORDER BY payment_date;
```

### 4. **確認收款後更新狀態**

收到款項後，在 Supabase 中更新訂單狀態：

```sql
UPDATE orders
SET status = 'confirmed'
WHERE order_id = 'ORD1738012345678';
```

---

## 📈 訂單統計

### 今日訂單統計

```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(total_price) as total_revenue,
  SUM(discount_amount) as total_discount
FROM orders
WHERE DATE(created_at) = CURRENT_DATE;
```

### 優惠碼使用統計

```sql
SELECT 
  promo_code,
  COUNT(*) as usage_count,
  SUM(discount_amount) as total_discount
FROM orders
WHERE promo_code IS NOT NULL
GROUP BY promo_code
ORDER BY usage_count DESC;
```

### 熱銷商品排行

```sql
SELECT 
  item->>'name' as product_name,
  SUM((item->>'quantity')::int) as total_quantity
FROM orders,
  jsonb_array_elements(items) as item
GROUP BY item->>'name'
ORDER BY total_quantity DESC
LIMIT 10;
```

---

## 🔐 資料安全

### Row Level Security (RLS)

Supabase 已啟用 RLS 政策：

- ✅ **匿名用戶**：只能新增訂單（INSERT）
- ✅ **已認證用戶**：可查看和更新訂單（SELECT, UPDATE）
- ❌ **匿名用戶**：無法查看他人訂單
- ❌ **無法刪除訂單**

### 環境變數保護

敏感資訊儲存在 `.env.local`：
- Supabase 連線資訊
- Email API 金鑰（Resend）
- LINE Notify Token
- 銀行帳號資訊

⚠️ **重要**：`.env.local` 已加入 `.gitignore`，不會上傳到 GitHub

---

## 🎯 訂單管理最佳實踐

### 1. **每日檢查**
- 早上：查看今日預計轉帳的訂單
- 下午：確認收款並更新狀態
- 晚上：準備明日取貨的商品

### 2. **客戶溝通**
- 收款後：傳訊息確認（可透過 LINE 或電話）
- 取貨前一天：提醒客戶取貨時間
- 如有問題：主動聯繫客戶

### 3. **資料備份**
- 每週：匯出訂單資料為 CSV
- 每月：統計銷售報表
- 定期：檢查 Supabase 儲存空間

### 4. **優惠碼管理**
- 監控使用次數
- 停用過期優惠碼
- 分析優惠碼效益

---

## 📱 行動裝置管理

### Supabase App（iOS/Android）

您可以下載 Supabase 官方 App，隨時隨地查看訂單：

1. 下載 Supabase App
2. 登入您的帳號
3. 選擇專案
4. 查看 `orders` 資料表

---

## 🆘 常見問題

### Q: 客戶說沒收到確認信？
**A:** 檢查：
1. Email 是否正確
2. 垃圾信件夾
3. Supabase 中該訂單的 Email 欄位
4. Resend 寄件記錄

### Q: LINE 通知沒有收到？
**A:** 檢查：
1. LINE Notify Token 是否正確
2. 是否已綁定 LINE 帳號
3. 伺服器 Console 是否有錯誤

### Q: 如何取消訂單？
**A:** 在 Supabase 中：
```sql
UPDATE orders
SET status = 'cancelled'
WHERE order_id = 'ORD1738012345678';
```

### Q: 如何修改訂單？
**A:** 直接在 Table Editor 中點擊訂單，編輯相關欄位。

---

## 🎉 訂單流程總結

```
1. 客戶下單
   ↓
2. 資料儲存到 Supabase
   ↓
3. 發送通知（Email + LINE）
   ↓
4. 客戶選擇轉帳日期
   ↓
5. 客戶轉帳
   ↓
6. 您確認收款
   ↓
7. 更新訂單狀態
   ↓
8. 準備商品
   ↓
9. 客戶取貨
   ↓
10. 訂單完成！
```

**資料永久儲存在 Supabase，隨時可查詢和匯出！** 📊✨
