# 🚚 宅配功能使用指南

## 📋 功能概述

月島甜點預訂系統現在支援兩種取貨方式：

1. **🏪 門市自取**（預設）
   - 客戶到店取貨
   - 無運費
   - 需選擇取貨日期和時段

2. **🚚 宅配**
   - 商品寄送到指定地址
   - 運費：$150（滿 $2000 免運）
   - 需填寫收件地址

---

## 🗄️ 資料庫設定

### 步驟 1：執行 SQL 腳本

在 Supabase Dashboard → SQL Editor 執行：

```sql
-- 檔案位置：scripts/DELIVERY_SETUP.sql
```

這會：
- ✅ 在 `orders` 表新增 4 個欄位：
  - `delivery_method` (pickup/delivery)
  - `delivery_address` (宅配地址)
  - `delivery_fee` (運費金額)
  - `delivery_notes` (宅配備註)
- ✅ 建立 `delivery_settings` 表（未來可調整運費規則）
- ✅ 設定預設運費：$150，滿 $2000 免運

---

## 📅 日期控制

### 最早取貨日期：今天 + 3 天

系統會自動計算：

- **今天**：2026-01-27
- **最早可選日期**：2026-01-30（三天後）

客戶在選擇取貨日期時，日期選擇器會自動限制，無法選擇今天、明天、後天。

---

## 💰 運費規則

### 目前設定

| 條件 | 運費 |
|------|------|
| 門市自取 | $0 |
| 宅配 + 訂單金額 < $2000 | $150 |
| 宅配 + 訂單金額 ≥ $2000 | $0（免運） |

### 未來可調整

在 Supabase `delivery_settings` 表可以：
- 修改運費金額
- 調整免運門檻
- 設定不同地區運費（需前端配合）

---

## 📝 訂單流程

### 門市自取流程

1. 客戶選擇「門市自取」
2. 選擇取貨日期（最早為今天+3天）
3. 選擇取貨時段（10:00-19:00）
4. 填寫預計轉帳日期
5. 提交訂單

### 宅配流程

1. 客戶選擇「宅配」
2. 選擇預計出貨日期（最早為今天+3天）
3. 選擇配送時段（不指定/上午/下午/晚上）
4. 填寫收件地址（必填）
5. 填寫宅配備註（選填，例如：請放管理室）
6. 填寫預計轉帳日期
7. 提交訂單

系統會自動計算運費並加入總額。

---

## 📧 通知內容

### Email 確認信

客戶收到的 Email 會顯示：

**門市自取：**
```
🏪 取貨方式：門市自取
🕐 取貨時間：2026-01-30 14:00-15:00
```

**宅配：**
```
🚚 取貨方式：宅配
📍 收件地址：台南市安南區...
💰 運費：$150（或 免運）
📝 備註：請放管理室
📅 預計出貨：2026-01-30
```

### LINE 通知

您收到的 LINE 通知會包含：

**門市自取：**
```
🏪 取貨方式：門市自取
🕐 取貨時間：2026-01-30 14:00-15:00
```

**宅配：**
```
🚚 取貨方式：宅配
📍 收件地址：台南市安南區...
💰 運費：$150
📝 備註：請放管理室
📅 預計出貨：2026-01-30
```

---

## 🔍 查詢宅配訂單

### 在 Supabase 查詢

```sql
-- 查詢所有宅配訂單
SELECT 
  order_id,
  customer_name,
  phone,
  delivery_address,
  delivery_fee,
  total_price,
  created_at
FROM orders
WHERE delivery_method = 'delivery'
ORDER BY created_at DESC;
```

### 查詢今日需出貨的宅配訂單

```sql
SELECT 
  order_id,
  customer_name,
  phone,
  delivery_address,
  delivery_notes,
  pickup_time
FROM orders
WHERE delivery_method = 'delivery'
  AND DATE(pickup_time) = CURRENT_DATE
  AND status = 'confirmed'
ORDER BY pickup_time;
```

---

## ⚙️ 調整運費規則

### 方法 1：修改 `delivery_settings` 表

在 Supabase Table Editor：

1. 進入 `delivery_settings` 表
2. 找到「標準宅配」那一筆
3. 修改：
   - `delivery_fee`：運費金額
   - `free_shipping_threshold`：免運門檻

### 方法 2：新增不同運費規則

```sql
INSERT INTO delivery_settings (name, min_order_amount, delivery_fee, free_shipping_threshold)
VALUES
  ('低溫宅配', 0, 200, 3000, true);
```

---

## 🎯 測試建議

### 測試門市自取

1. 加入商品到購物車
2. 前往結帳
3. 選擇「門市自取」
4. 確認日期選擇器最早日期為「今天+3天」
5. 選擇日期和時段
6. 提交訂單
7. 檢查 Email 和 LINE 通知

### 測試宅配

1. 加入商品到購物車
2. 前往結帳
3. 選擇「宅配」
4. 確認運費顯示正確：
   - 訂單 < $2000 → 顯示「運費 $150」
   - 訂單 ≥ $2000 → 顯示「滿額免運」
5. 填寫收件地址
6. 提交訂單
7. 檢查總額是否包含運費
8. 檢查 Email 和 LINE 通知是否包含地址

---

## 📊 訂單管理

### 查看運費統計

```sql
SELECT 
  delivery_method,
  COUNT(*) as order_count,
  SUM(delivery_fee) as total_delivery_fee,
  AVG(total_price) as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY delivery_method;
```

### 查看免運訂單

```sql
SELECT 
  order_id,
  customer_name,
  total_price,
  delivery_fee
FROM orders
WHERE delivery_method = 'delivery'
  AND delivery_fee = 0
ORDER BY created_at DESC;
```

---

## 🚀 未來擴充

### 可考慮加入的功能

1. **依地區計算運費**
   - 台南市內：$100
   - 外縣市：$200
   - 離島：$300

2. **冷凍宅配加價**
   - 一般宅配：$150
   - 冷凍宅配：$250

3. **指定時段配送**
   - 上午、下午、晚上
   - 需額外費用

4. **宅配追蹤號碼**
   - 在 `orders` 表新增 `tracking_number` 欄位
   - 出貨後填入，Email 自動通知客戶

---

## ✅ 完成！

現在您的預訂系統支援：

- ✅ 門市自取（預設）
- ✅ 宅配（含運費計算）
- ✅ 日期控制（最早今天+3天）
- ✅ 運費自動計算（滿額免運）
- ✅ Email 和 LINE 通知包含宅配資訊

**準備好提供給測試顧客使用了！** 🎉
