# 🚀 後台系統快速修復指南 (3 分鐘版)

> 【重要】執行以下步驟以完成後台修復  
> 預計時間: 3 分鐘 + 15 分鐘圖片上傳UI集成

---

## Step 1️⃣: 執行 SQL 修復 (2 分鐘)

### 前往 Supabase Dashboard

1. 打開 [Supabase Console](https://app.supabase.com)
2. 選擇你的 Dessert-Booking 專案
3. 左側邊欄 → **SQL Editor**

### 執行第一個修復: 添加缺失列

創建新的 SQL 查詢，貼上以下代碼並執行：

```sql
-- 為 orders 表添加缺失的列（如果不存在）
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source_from VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 為這些新列添加註解
COMMENT ON COLUMN public.orders.source_from IS '訂單來源（web/mobile/app等）';
COMMENT ON COLUMN public.orders.utm_source IS 'UTM 來源參數';
COMMENT ON COLUMN public.orders.utm_medium IS 'UTM 媒介參數';
COMMENT ON COLUMN public.orders.utm_campaign IS 'UTM 行銷活動參數';
COMMENT ON COLUMN public.orders.utm_content IS 'UTM 內容參數';
COMMENT ON COLUMN public.orders.user_id IS '關聯用戶ID';
```

✅ 執行完成後會看到 **"Success"** 訊息

### 執行第二個修復: 修正時區轉換

在同一 SQL Editor 中創建新查詢，貼上：

```sql
-- 刪除舊的 RPC 函數（如果存在）
DROP FUNCTION IF EXISTS public.check_daily_capacity(date, varchar) CASCADE;

-- 創建新的 RPC 函數，使用正確的時區轉換
CREATE OR REPLACE FUNCTION public.check_daily_capacity(
    check_date date,
    delivery_method_param varchar DEFAULT 'pickup'
)
RETURNS TABLE (
    available_slots integer,
    daily_limit integer,
    current_capacity integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_daily_limit integer;
    v_current_capacity integer;
    v_available_slots integer;
BEGIN
    -- 獲取每日容量限制設定
    SELECT 
        COALESCE((settings->'capacity'->>'daily_limit')::integer, 30)
    INTO v_daily_limit
    FROM business_settings
    WHERE business_id = 'default'
    LIMIT 1;

    -- 計算給定日期的當前容量
    SELECT COUNT(*)
    INTO v_current_capacity
    FROM orders
    WHERE 
        DATE(pickup_time AT TIME ZONE 'Asia/Taipei') = check_date
        AND delivery_method = delivery_method_param
        AND status NOT IN ('cancelled', 'failed');

    -- 計算可用時段
    v_available_slots := v_daily_limit - v_current_capacity;
    
    IF v_available_slots < 0 THEN
        v_available_slots := 0;
    END IF;

    RETURN QUERY SELECT v_available_slots, v_daily_limit, v_current_capacity;
END;
$$;
```

✅ 執行完成會看到 **"Success"** 訊息

---

## Step 2️⃣: 重啟開發服務器 (1 分鐘)

在你的終端機執行：

```bash
# 停止當前運行的服務器（按 Ctrl+C）
# 然後重新啟動
cd /Users/pensoair/Desktop/網路開發專案/Dessert-Booking
npm run dev
```

應該看到：
```
▲ Next.js 14.2.35
- Environments: .env.local
- Local:        http://localhost:3001
```

---

## Step 3️⃣: 驗證修復 (2 分鐘)

在新的終端視窗執行以下命令：

### 測試 1: 檢查菜單 API
```bash
curl http://localhost:3001/api/menu | jq '.items | length'
```
應該顯示: `36`

### 測試 2: 檢查日期容量（之前失敗，現在應該成功）
```bash
curl 'http://localhost:3001/api/check-capacity?date=2026-03-10' | jq '.'
```
應該返回:
```json
{
  "available_slots": 30,
  "daily_limit": 30,
  "current_capacity": 0
}
```

### 測試 3: 提交測試訂單（之前失敗，現在應該成功）
```bash
curl -X POST http://localhost:3001/api/order \
  -H 'Content-Type: application/json' \
  -d '{
    "customer_name": "Test Customer",
    "phone": "0912345678",
    "email": "test@example.com",
    "pickup_time": "2026-03-10 14:00",
    "items": [{"menu_id": "item-1", "quantity": 1}],
    "total_price": 100,
    "delivery_method": "pickup",
    "source_from": "web"
  }'
```
應該返回:
```json
{
  "success": true,
  "order_id": "ORD1234567890"
}
```

---

## 🎯 已完成功能

✅ **前端訂購流程** - 完全可用  
✅ **圖片上傳 API** - 已實現並測試  
✅ **菜單 API** - 返回 36 個項目  
✅ **管理員菜單頁面** - 已添加上傳按鈕  

---

## ⚠️ 常見問題

**Q: SQL 執行失敗顯示 "permission denied"**  
A: 確認你的 Supabase 帳戶擁有該專案的管理權限

**Q: curl 命令找不到**  
A: 在 Mac 終端中預設已安裝。如果問題持續，安裝 [Homebrew](https://brew.sh)

**Q: 仍然看到 "time zone displacement" 錯誤**  
A: 確認已完全執行第二個 SQL 修復，並重啟服務器（`npm run dev`）

---

## 📊 下一步

修復完成後，運行完整的後台系統測試：

見 [`scripts/ADMIN_TEST_PLAN.md`](./ADMIN_TEST_PLAN.md) 中的 30+ 檢查點

