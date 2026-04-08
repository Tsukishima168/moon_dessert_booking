-- Fix capacity/date parsing for orders.pickup_time stored as text-like values.
-- Some environments store values like:
-- - 2026-04-15
-- - 2026-04-15 14:00
-- - 2026-04-15 12:00-13:00
-- Using left(..., 10) avoids timezone/text casting issues and keeps the
-- comparison stable across both text and timestamp-compatible column types.

CREATE OR REPLACE VIEW daily_order_stats AS
SELECT
  CASE
    WHEN pickup_time::text ~ '^\d{4}-\d{2}-\d{2}'
      THEN left(pickup_time::text, 10)::date
    ELSE NULL
  END AS pickup_date,
  delivery_method,
  COUNT(*) AS order_count,
  SUM(final_price) AS total_revenue
FROM orders
WHERE status NOT IN ('cancelled')
GROUP BY 1, delivery_method;

DROP FUNCTION IF EXISTS public.check_daily_capacity(DATE, TEXT);

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

  default_limit := COALESCE((settings->>'default_limit')::INTEGER, 5);
  special_limit := (settings->'special_dates'->>check_date::TEXT)::INTEGER;
  final_limit := COALESCE(special_limit, default_limit);

  SELECT COUNT(*) INTO current_orders
  FROM orders
  WHERE left(pickup_time::text, 10) = check_date::text
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

GRANT EXECUTE ON FUNCTION check_daily_capacity TO anon, authenticated;
GRANT SELECT ON daily_order_stats TO anon, authenticated;

COMMENT ON FUNCTION check_daily_capacity IS '檢查指定日期的訂單產能（相容 text / timestamp pickup_time）';
COMMENT ON VIEW daily_order_stats IS '每日訂單統計視圖（相容 text / timestamp pickup_time）';
