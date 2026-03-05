# 🗓️ 菜單項目可用日期設定系統

**功能**: 避免特定蛋糕被訂到，設定公休日期和材料用盡日期

**日期**: 2026年3月5日  
**狀態**: 🟡 開發完成，待 SQL 執行

---

## 📋 功能清單

### 對於每個菜單項目，可以設定：

| 功能 | 說明 | 範例 |
|------|------|------|
| **啟用/停用** | 整體停止提供此項目 | 停用「提拉米蘇」 |
| **日期範圍** | 只在特定期間提供 | 2026/3/1-3/31 限定 |
| **黑名單日期** | 特定日期材料用盡 | 2026/3/5, 2026/3/15 無貨 |
| **可用週幾** | 選擇提供的日子（例如：只週二到五） | 週一公休、週日無外送 |
| **預訂提前時間** | 最少預訂提前多少小時 | 至少 24 小時前預訂 |
| **備註** | 說明文字 | "冬季限定" |

---

## 🔧 建置步驟

### Step 1: 執行 SQL 建立表結構

在 **Supabase Dashboard → SQL Editor** 執行：

```sql
-- 從 scripts/CREATE_MENU_AVAILABILITY.sql 複製全部內容
```

或直接複製以下完整 SQL：

```sql
-- 1. 建立菜單項目可用日期表
CREATE TABLE IF NOT EXISTS menu_item_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  
  -- 可用性設定
  is_available BOOLEAN DEFAULT TRUE,
  
  -- 日期範圍限制
  available_from DATE,
  available_until DATE,
  
  -- 特定日期黑名單
  unavailable_dates TEXT[] DEFAULT '{}'::TEXT[],
  
  -- 每週可用日期
  available_weekdays TEXT[] DEFAULT '{0,1,2,3,4,5,6}'::TEXT[],
  
  -- 預訂提前時間限制（小時）
  min_advance_hours INTEGER DEFAULT 24,
  
  -- 備註
  notes TEXT,
  
  -- 審計
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_menu_item UNIQUE(menu_item_id)
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_menu_availability_menu_item_id 
  ON menu_item_availability(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_availability_available 
  ON menu_item_availability(is_available);

-- 3. 建立 RLS 政策
ALTER TABLE menu_item_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous to view availability"
  ON menu_item_availability
  FOR SELECT
  TO anon
  USING (true);

-- 4. 建立檢查函數（用於驗證菜單項目可用性）
CREATE OR REPLACE FUNCTION check_menu_item_availability(
  menu_item_id_param UUID,
  delivery_date DATE,
  current_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  availability RECORD;
  hours_until_delivery INTEGER;
BEGIN
  SELECT * INTO availability
  FROM menu_item_availability
  WHERE menu_item_id = menu_item_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'available', TRUE,
      'reason', '無特殊限制'
    );
  END IF;
  
  IF NOT availability.is_available THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此項目已停止提供'
    );
  END IF;
  
  IF availability.available_from IS NOT NULL AND delivery_date < availability.available_from THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此項目尚未開放預訂'
    );
  END IF;
  
  IF availability.available_until IS NOT NULL AND delivery_date > availability.available_until THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此項目已停止接受此日期的預訂'
    );
  END IF;
  
  IF availability.unavailable_dates @> ARRAY[delivery_date::TEXT] THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此日期材料用盡或停止提供'
    );
  END IF;
  
  IF NOT (EXTRACT(DOW FROM delivery_date)::TEXT = ANY(availability.available_weekdays)) THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此項目在此日期不提供'
    );
  END IF;
  
  hours_until_delivery := EXTRACT(EPOCH FROM (delivery_date::TIMESTAMP WITH TIME ZONE - current_time)) / 3600;
  IF hours_until_delivery < availability.min_advance_hours THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '訂單時間距離交付日期不足' || availability.min_advance_hours || '小時'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'available', TRUE,
    'reason', '可預訂'
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

**期望結果**: ✅ 執行成功，0 errors

---

## 🎨 後台管理頁面

### 位置
**路由**: `/admin/menu-availability`  
**標籤**: 🗓️ 菜單項目可用日期設定

### 功能

1. **清單檢視**
   - 顯示所有菜單項目
   - 顯示目前的可用性設定
   - 快速編輯按鈕

2. **編輯模式**
   - 啟用/停用切換
   - 日期範圍選擇器
   - 黑名單日期管理（新增/移除）
   - 可用週幾按鈕選擇（全週可選）
   - 預訂提前時間輸入
   - 備註欄位

3. **儲存**
   - 按「保存設定」按鈕
   - 設定自動保存到 Supabase
   - 成功/失敗提示

---

## 📱 前端結帳頁面整合

**自動啟用**: 結帳頁面日期選擇時會自動驗證

### 驗證流程

1. 使用者選擇日期
2. 前端檢查：
   - 公休日限制（週幾）
   - 產能限制（`/api/check-capacity`）
   - **菜單項目可用性**（新） → 呼叫 `/api/check-menu-availability?date=YYYY-MM-DD`
3. 如果有任何限制，顯示錯誤訊息
4. 使用者只能預訂完全可用的日期

### 使用者看到的錯誤訊息範例

```
❌ 此日期材料用盡或停止提供
❌ 此項目已停止提供
❌ 此項目在此日期不提供
❌ 訂單時間距離交付日期不足 24 小時
```

---

## 🚀 快速使用指南

### 範例 1：停止特定蛋糕預訂

1. 進入 `/admin/menu-availability`
2. 找到「黑森林蛋糕」
3. 點擊「編輯」
4. 關閉「啟用此項目」
5. 點擊「保存設定」
6. ✅ 後續訂購將拒絕此項目

### 範例 2：設定季節限定商品

**冬季限定抹茶蛋糕** (11月-2月)

1. 進入 `/admin/menu-availability`
2. 找到「抹茶蛋糕」
3. 點擊「編輯」
4. 設定日期範圍：
   - 可預訂起日: `2025-11-01`
   - 可預訂迄日: `2026-02-28`
5. 點擊「保存設定」
6. ✅ 其他月份無法訂購

### 範例 3：材料用盡日期

**草莓塔在 3/8 & 3/15 材料用盡**

1. 進入 `/admin/menu-availability`
2. 找到「草莓塔」
3. 點擊「編輯」
4. 在「不提供日期」區塊：
   - 選擇 `2026-03-08` → 點「+」
   - 選擇 `2026-03-15` → 點「+」
5. 點擊「保存設定」
6. ✅ 這兩天無法訂購草莓塔

### 範例 4：週幾限制

**提拉米蘇只在週二到五提供**

1. 進入 `/admin/menu-availability`
2. 找到「提拉米蘇」
3. 點擊「編輯」
4. 在「可提供服務的日期」中：
   - 關閉: 週日、週一、週六
   - 保留: 週二、週三、週四、週五
5. 點擊「保存設定」
6. ✅ 其他日期無法訂購

---

## 🔄 整合公休日系統

**與現有公休日系統的區別**:

| 設定位置 | 適用對象 | 用途 |
|---------|--------|------|
| **Business Settings** | 全店 | 店鋪公休（停止所有訂單） |
| **Menu Availability** | 單項菜單 | 特定蛋糕缺貨、季節限定 |

### 優先級

當日期驗證時，按以下順序檢查：

1. 📅 **店鋪公休日** (Business Settings)
   - 若店鋪公休，所有菜單項目都無法訂
2. 🍰 **菜單項目可用性** (Menu Availability)
   - 若此菜單項目停止提供，無法訂此項目
3. 📦 **產能限制** (Check Capacity)
   - 若當日已達上限，無法訂

---

## 💾 API 參考

### 檢查菜單項目可用性

```bash
GET /api/check-menu-availability?date=2026-03-08&menu_item_id=uuid
```

**回應**:
```json
{
  "available": true,
  "reason": "可預訂"
}
```

或

```json
{
  "available": false,
  "reason": "此日期材料用盡或停止提供"
}
```

### 管理菜單項目可用性

```bash
POST /api/admin/menu-availability
```

**請求體**:
```json
{
  "menu_item_id": "uuid",
  "is_available": true,
  "available_from": "2026-03-01",
  "available_until": "2026-03-31",
  "unavailable_dates": ["2026-03-05", "2026-03-15"],
  "available_weekdays": ["1", "2", "3", "4", "5"],
  "min_advance_hours": 24,
  "notes": "冬季限定"
}
```

---

## ⚠️ 注意事項

- SQL 執行後需要**重啟開發伺服器**: `npm run dev`
- 更改設定**立即生效**，無需部署
- 黑名單日期和範圍日期可以同時使用
- 如果沒有特定設定，菜單項目預設**全週可用**

---

## 📄 檔案清單

| 檔案 | 功能 |
|------|------|
| `scripts/CREATE_MENU_AVAILABILITY.sql` | SQL 初始化腳本 |
| `app/admin/menu-availability/page.tsx` | 後台管理頁面 |
| `app/api/admin/menu-availability/route.ts` | 管理 API |
| `app/api/check-menu-availability/route.ts` | 查詢 API |

---

**準備就緒** ✅  
執行 SQL 後，進入 `/admin/menu-availability` 開始設定！
