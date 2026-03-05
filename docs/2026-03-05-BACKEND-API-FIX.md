# 🚨 後端 API 問題診斷與修復 - 2026-03-05

## 問題列表

### ✅ 已診斷的後端問題

| # | 問題 | 位置 | 嚴重度 | 狀態 |
|----|------|------|--------|------|
| 1 | `source_from` 列缺失 | `orders` 表 | 🔴 關鍵 | 待修復 |
| 2 | 時區轉換錯誤 | `check_daily_capacity()` RPC | 🔴 關鍵 | 待修復 |

---

## 問題 1: orders 表缺少 source_from 列

### 症狀
```
POST /api/order 返回 500 錯誤
Error: Could not find the 'source_from' column of 'orders' in the schema cache
```

### 根本原因
- 後端代碼在 `app/api/order/route.ts` 第 87 行嘗試寫入 `source_from` 欄位
- 數據庫 `orders` 表缺少此欄位或未刷新架構快取

### 修復方案

**步驟 1**: 在 Supabase SQL Editor 執行:
```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_from TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;
```

**步驟 2**: 驗證欄位已添加:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
```

應該看到: `source_from, utm_source, utm_medium, utm_campaign, utm_content, utm_term, user_id`

**步驟 3**: 重新啟動開發伺服器:
```bash
Ctrl+C # 停止開發伺服器
npm run dev # 重新啟動
```

---

## 問題 2: 時區轉換錯誤

### 症狀
```
GET /api/check-capacity?date=2026-03-08 返回 500 錯誤
Error: time zone displacement out of range: "2026-02-28 16:00-17:00"
```

### 根本原因
- RPC 函式 `check_daily_capacity()` 在 `DATE(pickup_time)` 時發生時區轉換失敗
- `pickup_time` 被儲存為文本 (TEXT)，轉換為時間戳時出現無效的時區位移

### 修復方案

**步驟 1**: 備份資料 (可選)
```sql
-- 如需備份，執行以下查詢導出資料
SELECT * FROM orders LIMIT 100;
```

**步驟 2**: 在 Supabase SQL Editor 執行修復腳本:

位置: `scripts/FIX_TIMEZONE_ISSUE.sql`

**關鍵修改**:
```sql
-- 舊 (有問題的) 寫法:
WHERE DATE(pickup_time) = check_date

-- 新 (修復後) 寫法:
WHERE DATE(pickup_time::TIMESTAMP AT TIME ZONE 'Asia/Taipei') = check_date
```

**步驟 3**: 驗證修復:
```sql
-- 測試查詢應返回容量數據，不應有時區錯誤
SELECT * FROM check_daily_capacity('2026-03-08'::DATE, 'pickup');
```

**預期結果**:
```
date          | current_count | capacity_limit | available | reason
2026-03-08    | 0             | 20             | true      | 尚可接單 20 筆
```

---

## 🔧 完整修復步驟 (按順序執行)

### 第 1 步: 登入 Supabase Dashboard
1. 進入 https://app.supabase.com
2. 選擇 Dessert-Booking 項目
3. 進入 SQL Editor

### 第 2 步: 執行列修復腳本
複製並執行 `FIX_ORDERS_COLUMNS.sql`:
```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_from TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;
```

### 第 3 步: 執行時區修復腳本
複製並執行 `FIX_TIMEZONE_ISSUE.sql`:
```sql
DROP FUNCTION IF EXISTS check_daily_capacity(DATE, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION check_daily_capacity(
  check_date DATE,
  delivery_method_param TEXT DEFAULT 'pickup'
)
RETURNS TABLE(
  date DATE,
  current_count BIGINT,
  capacity_limit INTEGER,
  available BOOLEAN,
  reason TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  settings JSONB;
  default_limit INTEGER;
  special_limit INTEGER;
  current_orders BIGINT;
  final_limit INTEGER;
BEGIN
  SELECT setting_value INTO settings
  FROM business_settings
  WHERE setting_key = 'daily_capacity';
  
  default_limit := COALESCE((settings->>'default_limit')::INTEGER, 20);
  special_limit := (settings->'special_dates'->>check_date::TEXT)::INTEGER;
  final_limit := COALESCE(special_limit, default_limit);
  
  SELECT COUNT(*) INTO current_orders
  FROM orders
  WHERE DATE(pickup_time::TIMESTAMP AT TIME ZONE 'Asia/Taipei') = check_date
    AND delivery_method = delivery_method_param
    AND status NOT IN ('cancelled');
  
  IF current_orders >= final_limit THEN
    RETURN QUERY SELECT 
      check_date,
      current_orders,
      final_limit,
      false,
      format('當日已達產能上限 (%s/%s)', current_orders, final_limit);
  ELSE
    RETURN QUERY SELECT 
      check_date,
      current_orders,
      final_limit,
      true,
      format('尚可接單 %s 筆', final_limit - current_orders);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_daily_capacity(DATE, TEXT) TO anon, authenticated;
```

### 第 4 步: 驗證修復
執行以下測試查詢:

1️⃣ 測試容量檢查:
```sql
SELECT * FROM check_daily_capacity('2026-03-08'::DATE, 'pickup');
```

2️⃣ 測試訂單插入:
```sql
SELECT * FROM orders LIMIT 1;
```

### 第 5 步: 重啟開發伺服器
```bash
# 終端中
Ctrl+C

npm run dev
```

### 第 6 步: 測試 API
```bash
# 測試菜單 API
curl http://localhost:3001/api/menu

# 測試容量檢查 API
curl 'http://localhost:3001/api/check-capacity?date=2026-03-08&method=pickup'

# 測試訂單提交 API
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Test","phone":"0932876625","email":"test@test.com","pickup_time":"2026-03-08 14:00","items":[{"id":"1","name":"Test","price":100,"quantity":1}],"total_price":100,"final_price":100}'
```

---

## 📊 測試結果預期

### 修復前
```
❌ GET  /api/check-capacity → 500 (時區錯誤)
❌ POST /api/order → 500 (列缺失)
```

### 修復後
```
✅ GET  /api/check-capacity → 200 (返回容量數據)
✅ POST /api/order → 200 (訂單成功建立)
✅ GET  /api/menu → 200 (菜單數據正常)
```

---

## 📝 相關檔案

- `scripts/FIX_ORDERS_COLUMNS.sql` - 列修復腳本
- `scripts/FIX_TIMEZONE_ISSUE.sql` - 時區修復腳本
- `app/api/order/route.ts` - 訂單 API
- `app/api/check-capacity/route.ts` - 容量檢查 API
- `supabase/migrations/20260130_reservation_functions.sql` - 原始 RPC 函式

---

## ⏱️ 預期修復時間

| 步驟 | 預期耗時 |
|-----|---------|
| 登入 Supabase | 1 分鐘 |
| 執行列修復 | 1 分鐘 |
| 執行時區修復 | 2 分鐘 |
| 驗證修復 | 2 分鐘 |
| 重啟伺服器 | 2 分鐘 |
| **總計** | **8 分鐘** |

---

**文檔建立時間**: 2026-03-05 11:50
**狀態**: 🟡 待執行修復
**優先級**: 🔴 關鍵 (阻塞前端訂購流程)

#backend #api #supabase #bug-fix #timezone #database
