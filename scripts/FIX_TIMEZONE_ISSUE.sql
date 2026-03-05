-- ============================================
-- 🔧 修復: 時區問題導致日期檢查失敗
-- ============================================
-- 執行位置: Supabase Dashboard → SQL Editor
-- 執行前務必備份數據！
-- ============================================

-- 問題: DATE(pickup_time) 在時區轉換時出現範圍錯誤
-- 解決方案: 使用 AT TIME ZONE 顯式轉換為台灣時區

-- 備份舊函式
DROP FUNCTION IF EXISTS check_daily_capacity(DATE, TEXT) CASCADE;

-- 重新建立修復後的函式
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
  
  -- 預設上限 (若無設定則為 20)
  default_limit := COALESCE((settings->>'default_limit')::INTEGER, 20);
  
  -- 檢查是否有特殊日期設定
  special_limit := (settings->'special_dates'->>check_date::TEXT)::INTEGER;
  
  -- 使用特殊設定或預設值
  final_limit := COALESCE(special_limit, default_limit);
  
  -- 計算當日現有訂單數 (使用正確的時區轉換)
  -- 重點: 先轉換為文本欄位的日期部分，避免時區問題
  SELECT COUNT(*) INTO current_orders
  FROM orders
  WHERE DATE(pickup_time::TIMESTAMP AT TIME ZONE 'Asia/Taipei') = check_date
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

-- 授予權限
GRANT EXECUTE ON FUNCTION check_daily_capacity(DATE, TEXT) TO anon, authenticated;

-- 測試查詢 (執行後應返回容量信息，不應有時區錯誤)
SELECT * FROM check_daily_capacity('2026-03-08'::DATE, 'pickup');
