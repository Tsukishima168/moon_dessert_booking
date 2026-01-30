-- ============================================
-- 營業設定與日期控制系統
-- ============================================

-- 1. 建立營業設定表
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立每日訂單統計視圖（用於檢查是否達到上限）
CREATE OR REPLACE VIEW daily_order_stats AS
SELECT 
  DATE(pickup_time) as order_date,
  delivery_method,
  COUNT(*) as order_count
FROM orders
WHERE status IN ('pending', 'confirmed')
GROUP BY DATE(pickup_time), delivery_method;

-- 3. 插入預設營業設定
INSERT INTO business_settings (setting_key, setting_value, description)
VALUES
  -- 公休日（完全不接單）
  ('closed_dates', '[]'::jsonb, '公休日期列表，格式：["2026-01-30", "2026-02-10"]'),
  
  -- 不宅配日（只接受門市自取）
  ('no_delivery_dates', '[]'::jsonb, '不提供宅配的日期列表'),
  
  -- 每週固定公休日（例如：週日）
  ('weekly_closed_days', '[0]'::jsonb, '每週固定公休日，0=週日, 1=週一, ..., 6=週六'),
  
  -- 每週固定不宅配日（例如：週日）
  ('weekly_no_delivery_days', '[0]'::jsonb, '每週固定不宅配日'),
  
  -- 每日接單上限（門市自取）
  ('daily_pickup_limit', '20'::jsonb, '每日門市自取訂單上限'),
  
  -- 每日接單上限（宅配）
  ('daily_delivery_limit', '10'::jsonb, '每日宅配訂單上限'),
  
  -- 最早預訂天數（目前是 3 天）
  ('min_advance_days', '3'::jsonb, '最早可預訂日期距離今天的天數'),
  
  -- 最晚預訂天數（例如：30 天後）
  ('max_advance_days', '30'::jsonb, '最晚可預訂日期距離今天的天數')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. 建立 RLS（如果需要）
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous to view business settings"
  ON business_settings
  FOR SELECT
  TO anon
  USING (true);

-- 5. 建立函數：檢查日期是否可預訂
CREATE OR REPLACE FUNCTION check_date_availability(
  check_date DATE,
  delivery_method_param TEXT DEFAULT 'pickup'
)
RETURNS JSONB AS $$
DECLARE
  weekly_closed JSONB;
  weekly_no_delivery JSONB;
  closed_dates JSONB;
  no_delivery_dates JSONB;
  day_of_week INTEGER;
  is_closed BOOLEAN := false;
  is_no_delivery BOOLEAN := false;
  pickup_limit INTEGER;
  delivery_limit INTEGER;
  current_count INTEGER;
  is_full BOOLEAN := false;
  reason TEXT;
BEGIN
  -- 取得星期幾（0=週日, 1=週一, ..., 6=週六）
  day_of_week := EXTRACT(DOW FROM check_date)::INTEGER;
  
  -- 讀取設定
  SELECT setting_value INTO weekly_closed
  FROM business_settings WHERE setting_key = 'weekly_closed_days';
  
  SELECT setting_value INTO weekly_no_delivery
  FROM business_settings WHERE setting_key = 'weekly_no_delivery_days';
  
  SELECT setting_value INTO closed_dates
  FROM business_settings WHERE setting_key = 'closed_dates';
  
  SELECT setting_value INTO no_delivery_dates
  FROM business_settings WHERE setting_key = 'no_delivery_dates';
  
  SELECT setting_value::INTEGER INTO pickup_limit
  FROM business_settings WHERE setting_key = 'daily_pickup_limit';
  
  SELECT setting_value::INTEGER INTO delivery_limit
  FROM business_settings WHERE setting_key = 'daily_delivery_limit';
  
  -- 檢查是否在每週公休日
  IF weekly_closed @> to_jsonb(day_of_week) THEN
    is_closed := true;
    reason := '每週固定公休日';
  END IF;
  
  -- 檢查是否在特定公休日
  IF closed_dates @> to_jsonb(check_date::TEXT) THEN
    is_closed := true;
    reason := '特定公休日';
  END IF;
  
  -- 如果是公休，直接返回
  IF is_closed THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', reason,
      'type', 'closed'
    );
  END IF;
  
  -- 檢查宅配限制
  IF delivery_method_param = 'delivery' THEN
    -- 檢查是否在每週不宅配日
    IF weekly_no_delivery @> to_jsonb(day_of_week) THEN
      is_no_delivery := true;
      reason := '每週固定不宅配日';
    END IF;
    
    -- 檢查是否在特定不宅配日
    IF no_delivery_dates @> to_jsonb(check_date::TEXT) THEN
      is_no_delivery := true;
      reason := '特定不宅配日';
    END IF;
    
    IF is_no_delivery THEN
      RETURN jsonb_build_object(
        'available', false,
        'reason', reason,
        'type', 'no_delivery'
      );
    END IF;
    
    -- 檢查宅配訂單上限
    SELECT COALESCE(order_count, 0) INTO current_count
    FROM daily_order_stats
    WHERE order_date = check_date AND delivery_method = 'delivery';
    
    IF current_count >= delivery_limit THEN
      is_full := true;
      reason := '宅配訂單已滿';
    END IF;
  ELSE
    -- 檢查門市自取訂單上限
    SELECT COALESCE(order_count, 0) INTO current_count
    FROM daily_order_stats
    WHERE order_date = check_date AND delivery_method = 'pickup';
    
    IF current_count >= pickup_limit THEN
      is_full := true;
      reason := '門市自取訂單已滿';
    END IF;
  END IF;
  
  IF is_full THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', reason,
      'type', 'full',
      'current_count', current_count,
      'limit', CASE WHEN delivery_method_param = 'delivery' THEN delivery_limit ELSE pickup_limit END
    );
  END IF;
  
  -- 日期可用
  RETURN jsonb_build_object(
    'available', true,
    'current_count', current_count,
    'limit', CASE WHEN delivery_method_param = 'delivery' THEN delivery_limit ELSE pickup_limit END
  );
END;
$$ LANGUAGE plpgsql;

-- 6. 建立函數：取得可預訂日期列表
CREATE OR REPLACE FUNCTION get_available_dates(
  start_date DATE,
  end_date DATE,
  delivery_method_param TEXT DEFAULT 'pickup'
)
RETURNS TABLE (
  date DATE,
  available BOOLEAN,
  reason TEXT,
  type TEXT,
  current_count INTEGER,
  limit_count INTEGER
) AS $$
DECLARE
  current_date DATE;
  result JSONB;
BEGIN
  FOR current_date IN 
    SELECT generate_series(start_date, end_date, '1 day'::interval)::DATE
  LOOP
    result := check_date_availability(current_date, delivery_method_param);
    
    RETURN QUERY SELECT
      current_date,
      (result->>'available')::BOOLEAN,
      result->>'reason',
      result->>'type',
      COALESCE((result->>'current_count')::INTEGER, 0),
      COALESCE((result->>'limit')::INTEGER, 0);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 使用範例
-- ============================================

-- 範例 1：設定週日為公休日（已預設）
-- SELECT setting_value FROM business_settings WHERE setting_key = 'weekly_closed_days';
-- 結果：'[0]' （0 = 週日）

-- 範例 2：新增特定公休日
-- UPDATE business_settings 
-- SET setting_value = '["2026-02-10", "2026-02-11"]'::jsonb
-- WHERE setting_key = 'closed_dates';

-- 範例 3：設定週日不宅配
-- UPDATE business_settings 
-- SET setting_value = '[0]'::jsonb
-- WHERE setting_key = 'weekly_no_delivery_days';

-- 範例 4：檢查某日期是否可預訂
-- SELECT check_date_availability('2026-01-30'::DATE, 'pickup');
-- SELECT check_date_availability('2026-01-30'::DATE, 'delivery');

-- 範例 5：取得未來 30 天可預訂日期
-- SELECT * FROM get_available_dates(
--   CURRENT_DATE + INTERVAL '3 days',
--   CURRENT_DATE + INTERVAL '30 days',
--   'pickup'
-- );

-- ============================================
-- 完成！
-- ============================================
