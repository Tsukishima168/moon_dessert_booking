# 🎫 優惠碼系統使用指南

## 📋 目錄
1. [系統概述](#系統概述)
2. [資料庫設定](#資料庫設定)
3. [優惠碼類型](#優惠碼類型)
4. [如何新增優惠碼](#如何新增優惠碼)
5. [客戶使用流程](#客戶使用流程)
6. [範例優惠碼](#範例優惠碼)

---

## 🎯 系統概述

優惠碼系統讓您可以提供折扣給客戶，支援：
- ✅ **百分比折扣** (例如：9折、8折)
- ✅ **固定金額折扣** (例如：折50元、折100元)
- ✅ **最低消費限制** (例如：滿500元可用)
- ✅ **使用次數限制** (例如：限量100組)
- ✅ **有效期限設定**
- ✅ **啟用/停用控制**

---

## 🗄️ 資料庫設定

### 步驟 1：執行 SQL 腳本

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 點擊左側 **SQL Editor**
4. 新增查詢，貼上 `scripts/PROMO_CODE_SETUP.sql` 的內容
5. 點擊 **Run** 執行

### 步驟 2：驗證資料表

執行後應該會看到：
- ✅ `promo_codes` 資料表
- ✅ `orders` 資料表新增優惠碼欄位
- ✅ 4 個測試優惠碼

---

## 💰 優惠碼類型

### 1. 百分比折扣 (percentage)

打折優惠，折扣值為百分比。

**範例：**
```sql
-- 全站9折（10% off）
code: 'WELCOME10'
discount_type: 'percentage'
discount_value: 10

-- 8折優惠（20% off）
code: 'SAVE20'
discount_type: 'percentage'
discount_value: 20
```

### 2. 固定金額折扣 (fixed)

直接減免金額。

**範例：**
```sql
-- 折50元
code: 'FIRST50'
discount_type: 'fixed'
discount_value: 50

-- 折100元
code: 'MOON100'
discount_type: 'fixed'
discount_value: 100
```

---

## ➕ 如何新增優惠碼

### 方法 1：Supabase Dashboard（推薦）

1. 進入 Supabase Dashboard
2. 點擊 **Table Editor**
3. 選擇 `promo_codes` 資料表
4. 點擊 **Insert** → **Insert row**
5. 填入以下欄位：

| 欄位 | 說明 | 範例 |
|------|------|------|
| `code` | 優惠碼（大寫） | `SUMMER25` |
| `discount_type` | 折扣類型 | `percentage` 或 `fixed` |
| `discount_value` | 折扣值 | `25` (25%折扣) 或 `100` (折100元) |
| `min_order_amount` | 最低消費金額 | `500` (滿500可用) |
| `max_uses` | 最大使用次數 | `100` (限量100組) 或留空 (無限) |
| `valid_until` | 有效期限 | `2026-12-31 23:59:59+00` 或留空 |
| `is_active` | 是否啟用 | `true` |
| `description` | 描述 | `夏季限定25%折扣` |

6. 點擊 **Save**

### 方法 2：SQL 語法

```sql
INSERT INTO promo_codes (
  code, 
  discount_type, 
  discount_value, 
  min_order_amount, 
  max_uses, 
  valid_until,
  description
) VALUES (
  'SUMMER25',           -- 優惠碼
  'percentage',         -- 百分比折扣
  25,                   -- 25% 折扣
  500,                  -- 滿 500 可用
  100,                  -- 限量 100 組
  NOW() + INTERVAL '60 days',  -- 60 天後到期
  '夏季限定25%折扣'
);
```

---

## 👤 客戶使用流程

### 步驟 1：加入商品到購物車
客戶瀏覽商品並加入購物車。

### 步驟 2：前往結帳頁面
點擊「前往結帳」。

### 步驟 3：輸入優惠碼
在結帳頁面的「PROMO CODE」區塊：
1. 輸入優惠碼（自動轉大寫）
2. 點擊 **APPLY** 按鈕
3. 系統驗證優惠碼

### 步驟 4：查看折扣
如果優惠碼有效：
- ✅ 顯示「優惠碼已成功套用」
- ✅ 訂單摘要顯示折扣金額
- ✅ 總價自動扣除折扣

### 步驟 5：完成訂單
填寫客戶資訊並提交訂單。

---

## 🎁 範例優惠碼

系統預設包含以下測試優惠碼：

### 1. WELCOME10
- **類型**：百分比折扣
- **折扣**：10% off
- **最低消費**：無限制
- **使用次數**：無限
- **說明**：新客戶歡迎優惠

### 2. SAVE20
- **類型**：百分比折扣
- **折扣**：20% off (8折)
- **最低消費**：$500
- **使用次數**：限量 100 組
- **說明**：滿500享8折

### 3. FIRST50
- **類型**：固定金額折扣
- **折扣**：折 $50
- **最低消費**：$300
- **使用次數**：限量 50 組
- **說明**：首購折50元

### 4. MOON100
- **類型**：固定金額折扣
- **折扣**：折 $100
- **最低消費**：$1000
- **使用次數**：無限
- **說明**：滿1000折100

---

## 🔍 驗證規則

系統會自動檢查以下條件：

1. ✅ **優惠碼存在且啟用**
2. ✅ **在有效期限內**
3. ✅ **訂單金額達到最低消費**
4. ✅ **未達使用次數上限**
5. ✅ **折扣不超過訂單金額**

如果不符合任一條件，系統會顯示對應錯誤訊息。

---

## 📊 管理優惠碼

### 查看所有優惠碼

```sql
SELECT 
  code,
  discount_type,
  discount_value,
  used_count,
  max_uses,
  is_active,
  valid_until
FROM promo_codes
ORDER BY created_at DESC;
```

### 停用優惠碼

```sql
UPDATE promo_codes 
SET is_active = false 
WHERE code = 'SUMMER25';
```

### 重置使用次數

```sql
UPDATE promo_codes 
SET used_count = 0 
WHERE code = 'SAVE20';
```

### 查看優惠碼使用紀錄

```sql
SELECT 
  order_id,
  customer_name,
  promo_code,
  original_price,
  discount_amount,
  final_price,
  created_at
FROM orders
WHERE promo_code IS NOT NULL
ORDER BY created_at DESC;
```

---

## 🎨 前端顯示

### 結帳頁面

優惠碼輸入框位於「YOUR INFORMATION」表單上方：

```
┌─────────────────────────────────┐
│ 🎫 PROMO CODE                   │
├─────────────────────────────────┤
│ [輸入框]            [APPLY]     │
└─────────────────────────────────┘
```

已套用時顯示：

```
┌─────────────────────────────────┐
│ 🎫 PROMO CODE                   │
├─────────────────────────────────┤
│ 🎫 SAVE20 (-$100)         [X]   │
└─────────────────────────────────┘
```

### 訂單摘要

```
SUBTOTAL              $500
DISCOUNT (SAVE20)    -$100
──────────────────────────
TOTAL                 $400
```

---

## 🚀 測試建議

1. **測試無效優惠碼**
   - 輸入 `INVALID123`
   - 應顯示「優惠碼無效或已過期」

2. **測試最低消費限制**
   - 訂單 $200，輸入 `SAVE20` (需滿$500)
   - 應顯示「此優惠碼需消費滿 $500」

3. **測試正常折扣**
   - 訂單 $600，輸入 `SAVE20`
   - 應折扣 $120 (20%)，總價 $480

4. **測試固定金額折扣**
   - 訂單 $500，輸入 `MOON100`
   - 應折扣 $100，總價 $400

---

## 💡 小技巧

### 建立限時優惠
```sql
-- 3天限時優惠
INSERT INTO promo_codes (code, discount_type, discount_value, valid_until)
VALUES ('FLASH30', 'percentage', 30, NOW() + INTERVAL '3 days');
```

### 建立首購優惠
```sql
-- 首購專屬，限量50組
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, description)
VALUES ('NEWBIE', 'fixed', 100, 50, '新客戶首購優惠');
```

### 建立節日優惠
```sql
-- 中秋節優惠
INSERT INTO promo_codes (
  code, discount_type, discount_value, 
  valid_from, valid_until, description
) VALUES (
  'MOON2026', 'percentage', 15,
  '2026-09-10', '2026-09-20',
  '中秋節特別優惠'
);
```

---

**優惠碼系統設定完成！** 🎉

如有問題，請檢查：
1. SQL 腳本是否執行成功
2. Supabase RLS 政策是否正確
3. 瀏覽器 Console 是否有錯誤訊息
