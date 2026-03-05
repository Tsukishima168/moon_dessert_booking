-- ============================================
-- 菜單項目可用日期設定系統
-- ============================================
-- 用途：避免特定蛋糕被訂到，或限制特定日期不提供

-- 1. 建立菜單項目可用日期表
CREATE TABLE IF NOT EXISTS menu_item_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  
  -- 可用性設定
  is_available BOOLEAN DEFAULT TRUE,  -- 整體可用性
  
  -- 日期範圍限制
  available_from DATE,                -- 最早可預訂日期
  available_until DATE,               -- 最晚可預訂日期
  
  -- 特定日期黑名單（例如材料用盡）
  unavailable_dates TEXT[] DEFAULT '{}'::TEXT[],
  
  -- 每週可用日期（0=週日, 1=週一, ..., 6=週六）
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

CREATE POLICY "Allow admin to manage availability"
  ON menu_item_availability
  FOR ALL
  TO authenticated
  USING (auth.jwt()->>'email' = ANY(ARRAY['admin@dessert.com', 'kk4e18@gmail.com']))
  WITH CHECK (auth.jwt()->>'email' = ANY(ARRAY['admin@dessert.com', 'kk4e18@gmail.com']));

-- 4. 建立檢查函數：驗證菜單項目是否可預訂
CREATE OR REPLACE FUNCTION check_menu_item_availability(
  menu_item_id_param UUID,
  delivery_date DATE,
  current_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  availability RECORD;
  min_advance_hours INTEGER;
  hours_until_delivery INTEGER;
  is_available BOOLEAN;
  reason TEXT;
BEGIN
  -- 查詢菜單項目可用性設定
  SELECT * INTO availability
  FROM menu_item_availability
  WHERE menu_item_id = menu_item_id_param;
  
  -- 如果沒有特定設定，默認可用
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'available', TRUE,
      'reason', '無特殊限制'
    );
  END IF;
  
  -- 檢查 1: 整體可用性
  IF NOT availability.is_available THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此項目已停止提供'
    );
  END IF;
  
  -- 檢查 2: 日期範圍
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
  
  -- 檢查 3: 特定日期黑名單
  IF availability.unavailable_dates @> ARRAY[delivery_date::TEXT] THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此日期材料用盡或停止提供'
    );
  END IF;
  
  -- 檢查 4: 週幾限制
  IF NOT (EXTRACT(DOW FROM delivery_date)::TEXT = ANY(availability.available_weekdays)) THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '此項目在此日期不提供'
    );
  END IF;
  
  -- 檢查 5: 預訂提前時間
  hours_until_delivery := EXTRACT(EPOCH FROM (delivery_date::TIMESTAMP WITH TIME ZONE - current_time)) / 3600;
  IF hours_until_delivery < availability.min_advance_hours THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '訂單時間距離交付日期不足' || availability.min_advance_hours || '小時'
    );
  END IF;
  
  -- 所有檢查通過
  RETURN jsonb_build_object(
    'available', TRUE,
    'reason', '可預訂'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. 驗證：查看所有菜單項目的可用性設定
SELECT 
  mi.id,
  mi.name,
  mia.is_available,
  mia.available_from,
  mia.available_until,
  mia.unavailable_dates,
  mia.available_weekdays
FROM menu_items mi
LEFT JOIN menu_item_availability mia ON mi.id = mia.menu_item_id
ORDER BY mi.name;
