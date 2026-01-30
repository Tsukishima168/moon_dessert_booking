-- 每日訂單統計視圖
-- 用於快速查詢每天的訂單數量,檢查是否達到產能上限

CREATE OR REPLACE VIEW daily_order_stats AS
SELECT 
  DATE(pickup_time) as pickup_date,
  delivery_method,
  COUNT(*) as order_count,
  SUM(final_price) as total_revenue
FROM orders
WHERE status NOT IN ('cancelled')
GROUP BY DATE(pickup_time), delivery_method;

-- 檢查特定日期產能的函式
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
  -- 取得產能設定
  SELECT setting_value INTO settings
  FROM business_settings
  WHERE setting_key = 'daily_capacity';
  
  -- 預設上限
  default_limit := (settings->>'default_limit')::INTEGER;
  
  -- 檢查是否有特殊日期設定
  special_limit := (settings->'special_dates'->>check_date::TEXT)::INTEGER;
  
  -- 使用特殊設定或預設值
  final_limit := COALESCE(special_limit, default_limit);
  
  -- 計算當日現有訂單數
  SELECT COUNT(*) INTO current_orders
  FROM orders
  WHERE DATE(pickup_time) = check_date
    AND delivery_method = delivery_method_param
    AND status NOT IN ('cancelled');
  
  -- 判斷是否還有空位
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

-- 檢查預訂是否符合規則的函式
CREATE OR REPLACE FUNCTION validate_reservation(
  pickup_date DATE,
  is_rush_order BOOLEAN DEFAULT false
)
RETURNS TABLE(
  valid BOOLEAN,
  reason TEXT,
  min_date DATE,
  max_date DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
  settings JSONB;
  min_days INTEGER;
  max_days INTEGER;
  allow_rush BOOLEAN;
  today DATE;
  days_diff INTEGER;
BEGIN
  -- 取得預訂規則設定
  SELECT setting_value INTO settings
  FROM business_settings
  WHERE setting_key = 'reservation_rules';
  
  min_days := (settings->>'min_advance_days')::INTEGER;
  max_days := (settings->>'max_advance_days')::INTEGER;
  allow_rush := (settings->>'allow_rush_orders')::BOOLEAN;
  
  today := CURRENT_DATE;
  days_diff := pickup_date - today;
  
  -- 檢查是否為過去日期
  IF pickup_date < today THEN
    RETURN QUERY SELECT 
      false,
      '無法預訂過去的日期',
      today + min_days,
      today + max_days;
    RETURN;
  END IF;
  
  -- 檢查急單
  IF days_diff < min_days THEN
    IF allow_rush AND is_rush_order THEN
      RETURN QUERY SELECT 
        true,
        format('急單預訂(需加價 %s%%)', (settings->>'rush_order_fee_percentage')::INTEGER),
        today + min_days,
        today + max_days;
    ELSE
      RETURN QUERY SELECT 
        false,
        format('請至少提前 %s 天預訂', min_days),
        today + min_days,
        today + max_days;
    END IF;
    RETURN;
  END IF;
  
  -- 檢查是否超過最大預訂天數
  IF days_diff > max_days THEN
    RETURN QUERY SELECT 
      false,
      format('最多只能提前 %s 天預訂', max_days),
      today + min_days,
      today + max_days;
    RETURN;
  END IF;
  
  -- 通過所有檢查
  RETURN QUERY SELECT 
    true,
    '符合預訂規則'::TEXT,
    today + min_days,
    today + max_days;
END;
$$;

-- 授權
GRANT EXECUTE ON FUNCTION check_daily_capacity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_reservation TO anon, authenticated;
GRANT SELECT ON daily_order_stats TO anon, authenticated;

COMMENT ON FUNCTION check_daily_capacity IS '檢查指定日期的訂單產能';
COMMENT ON FUNCTION validate_reservation IS '驗證預訂日期是否符合規則';
COMMENT ON VIEW daily_order_stats IS '每日訂單統計視圖';
