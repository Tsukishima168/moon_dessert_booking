# 📅 營業設定與日期控制指南

## 🎯 功能概述

這個系統讓您可以靈活控制：

1. **公休日**：完全不接單的日期（例如：週日、特定節日）
2. **不宅配日**：只接受門市自取，不提供宅配的日期
3. **每日接單上限**：達到上限後不再接受新訂單
4. **最早/最晚預訂天數**：控制可預訂的日期範圍

---

## 🗄️ 資料庫設定

### 步驟 1：執行 SQL 腳本

在 Supabase Dashboard → SQL Editor 執行：

```sql
-- 檔案位置：scripts/BUSINESS_SETTINGS_SETUP.sql
```

這會建立：
- ✅ `business_settings` 表（儲存所有營業設定）
- ✅ `daily_order_stats` 視圖（每日訂單統計）
- ✅ `check_date_availability()` 函數（檢查日期是否可預訂）
- ✅ `get_available_dates()` 函數（取得可預訂日期列表）

---

## ⚙️ 設定說明

### 1. 公休日設定

#### 每週固定公休日（例如：週日）

```sql
UPDATE business_settings 
SET setting_value = '[0]'::jsonb
WHERE setting_key = 'weekly_closed_days';
```

**星期對應：**
- `0` = 週日
- `1` = 週一
- `2` = 週二
- `3` = 週三
- `4` = 週四
- `5` = 週五
- `6` = 週六

**範例：週六、週日都公休**
```sql
UPDATE business_settings 
SET setting_value = '[0, 6]'::jsonb
WHERE setting_key = 'weekly_closed_days';
```

#### 特定日期公休（例如：春節、店休）

```sql
UPDATE business_settings 
SET setting_value = '["2026-02-10", "2026-02-11", "2026-02-12"]'::jsonb
WHERE setting_key = 'closed_dates';
```

---

### 2. 不宅配日設定

#### 每週固定不宅配日（例如：週日不宅配）

```sql
UPDATE business_settings 
SET setting_value = '[0]'::jsonb
WHERE setting_key = 'weekly_no_delivery_days';
```

#### 特定日期不宅配

```sql
UPDATE business_settings 
SET setting_value = '["2026-02-10", "2026-02-11"]'::jsonb
WHERE setting_key = 'no_delivery_dates';
```

**效果：**
- 這些日期仍可接受「門市自取」訂單
- 但無法選擇「宅配」選項

---

### 3. 每日接單上限

#### 門市自取上限

```sql
UPDATE business_settings 
SET setting_value = '20'::jsonb
WHERE setting_key = 'daily_pickup_limit';
```

#### 宅配上限

```sql
UPDATE business_settings 
SET setting_value = '10'::jsonb
WHERE setting_key = 'daily_delivery_limit';
```

**運作方式：**
- 系統會自動統計每日已接訂單數
- 達到上限後，該日期會顯示「訂單已滿」
- 客戶無法選擇該日期

---

### 4. 預訂日期範圍

#### 最早預訂天數（目前：3 天）

```sql
UPDATE business_settings 
SET setting_value = '3'::jsonb
WHERE setting_key = 'min_advance_days';
```

**說明：** 客戶最早可預訂「今天 + 3 天」的日期

#### 最晚預訂天數（目前：30 天）

```sql
UPDATE business_settings 
SET setting_value = '30'::jsonb
WHERE setting_key = 'max_advance_days';
```

**說明：** 客戶最晚可預訂「今天 + 30 天」的日期

---

## 📊 查看設定

### 查看所有設定

```sql
SELECT 
  setting_key,
  setting_value,
  description
FROM business_settings
ORDER BY setting_key;
```

### 查看特定設定

```sql
SELECT setting_value 
FROM business_settings 
WHERE setting_key = 'weekly_closed_days';
```

---

## 🧪 測試日期可用性

### 檢查單一日期

```sql
-- 檢查門市自取
SELECT check_date_availability('2026-01-30'::DATE, 'pickup');

-- 檢查宅配
SELECT check_date_availability('2026-01-30'::DATE, 'delivery');
```

**返回結果範例：**

```json
{
  "available": false,
  "reason": "每週固定公休日",
  "type": "closed"
}
```

或

```json
{
  "available": true,
  "current_count": 5,
  "limit": 20
}
```

### 取得未來 30 天可預訂日期

```sql
SELECT * FROM get_available_dates(
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '30 days',
  'pickup'
);
```

---

## 🎨 前端顯示

### 客戶體驗

當客戶選擇日期時：

1. **可預訂日期**：正常顯示，可選擇
2. **公休日**：顯示「✗ 每週固定公休日」或「✗ 特定公休日」
3. **不宅配日**（選擇宅配時）：顯示「✗ 每週固定不宅配日」
4. **訂單已滿**：顯示「✗ 門市自取訂單已滿 (20/20)」或「✗ 宅配訂單已滿 (10/10)」

### 日期選擇器限制

- `min` 屬性：最早可選日期（今天 + 3 天）
- `max` 屬性：最晚可選日期（今天 + 30 天）
- 自定義驗證：檢查選中日期是否可用

---

## 📝 常見使用情境

### 情境 1：週日公休

```sql
-- 設定週日公休
UPDATE business_settings 
SET setting_value = '[0]'::jsonb
WHERE setting_key = 'weekly_closed_days';
```

### 情境 2：週日不宅配，但可門市自取

```sql
-- 設定週日不宅配
UPDATE business_settings 
SET setting_value = '[0]'::jsonb
WHERE setting_key = 'weekly_no_delivery_days';
```

### 情境 3：春節連假公休

```sql
UPDATE business_settings 
SET setting_value = '["2026-02-10", "2026-02-11", "2026-02-12", "2026-02-13"]'::jsonb
WHERE setting_key = 'closed_dates';
```

### 情境 4：限制每日接單量

```sql
-- 門市自取：每日最多 20 單
UPDATE business_settings 
SET setting_value = '20'::jsonb
WHERE setting_key = 'daily_pickup_limit';

-- 宅配：每日最多 10 單
UPDATE business_settings 
SET setting_value = '10'::jsonb
WHERE setting_key = 'daily_delivery_limit';
```

### 情境 5：臨時調整（例如：某天已滿，手動關閉）

```sql
-- 將特定日期加入公休日
UPDATE business_settings 
SET setting_value = (
  SELECT jsonb_agg(DISTINCT value)
  FROM (
    SELECT value FROM jsonb_array_elements_text(setting_value)
    UNION
    SELECT '"2026-02-15"'::text
  ) t
)
WHERE setting_key = 'closed_dates';
```

---

## 🔍 查詢每日訂單統計

### 查看今日訂單數

```sql
SELECT 
  order_date,
  delivery_method,
  order_count
FROM daily_order_stats
WHERE order_date = CURRENT_DATE;
```

### 查看未來一週訂單統計

```sql
SELECT 
  order_date,
  delivery_method,
  order_count,
  CASE 
    WHEN delivery_method = 'pickup' THEN 
      (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_pickup_limit')
    ELSE 
      (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_delivery_limit')
  END as limit_count
FROM daily_order_stats
WHERE order_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY order_date, delivery_method;
```

### 查看即將滿單的日期

```sql
SELECT 
  dos.order_date,
  dos.delivery_method,
  dos.order_count,
  CASE 
    WHEN dos.delivery_method = 'pickup' THEN 
      (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_pickup_limit')
    ELSE 
      (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_delivery_limit')
  END as limit_count,
  ROUND(
    (dos.order_count::NUMERIC / 
     CASE 
       WHEN dos.delivery_method = 'pickup' THEN 
         (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_pickup_limit')
       ELSE 
         (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_delivery_limit')
     END
    ) * 100, 1
  ) as usage_percent
FROM daily_order_stats dos
WHERE dos.order_date >= CURRENT_DATE
  AND dos.order_count >= (
    CASE 
      WHEN dos.delivery_method = 'pickup' THEN 
        (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_pickup_limit')
      ELSE 
        (SELECT setting_value::INTEGER FROM business_settings WHERE setting_key = 'daily_delivery_limit')
    END * 0.8
  )
ORDER BY usage_percent DESC;
```

---

## 🚨 注意事項

### 1. 日期格式

所有日期必須使用 `YYYY-MM-DD` 格式，例如：`"2026-01-30"`

### 2. 時區

系統使用 Supabase 的時區設定，確保日期計算正確。

### 3. 訂單狀態

只有 `status` 為 `'pending'` 或 `'confirmed'` 的訂單才會計入每日統計。

### 4. 即時更新

設定變更後，前端會在下一次載入時自動更新可預訂日期列表。

---

## 🎯 最佳實踐

### 1. 提前設定節日公休

建議在節日前一週就設定好公休日期，避免客戶選擇到不可預訂的日期。

### 2. 監控訂單量

定期查看「即將滿單的日期」查詢，提前調整接單上限或增加人力。

### 3. 彈性調整

如果某天突然需要關閉，可以：
- 加入 `closed_dates`（完全關閉）
- 或降低 `daily_pickup_limit` / `daily_delivery_limit`（限制接單）

### 4. 客戶溝通

如果某日期已滿，建議：
- 在網站上顯示提示
- 或透過 Email/LINE 通知客戶改選其他日期

---

## ✅ 完成！

現在您可以：

- ✅ 設定公休日（每週固定或特定日期）
- ✅ 設定不宅配日（只接受門市自取）
- ✅ 控制每日接單上限
- ✅ 客戶選擇日期時自動過濾不可選日期
- ✅ 查看每日訂單統計

**準備好開始使用進階日期控制功能了！** 🎉
