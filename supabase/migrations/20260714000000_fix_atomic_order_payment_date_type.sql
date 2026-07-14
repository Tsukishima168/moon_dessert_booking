-- 修正 20260713000001 的 payment_date payload 型別。
-- orders.payment_date 為 timestamptz；宣告為 TEXT 會使函式在執行 INSERT 時觸發 42804。

CREATE OR REPLACE FUNCTION public.insert_order_with_capacity_check(order_payload JSONB)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_order public.orders;
  pickup_date DATE;
  delivery_method_value TEXT;
  settings JSONB;
  default_limit INTEGER;
  special_limit INTEGER;
  final_limit INTEGER;
  current_orders BIGINT;
BEGIN
  pickup_date := left(order_payload->>'pickup_time', 10)::DATE;
  delivery_method_value := COALESCE(order_payload->>'delivery_method', 'pickup');

  PERFORM pg_advisory_xact_lock(
    hashtext(format('shop-capacity:%s:%s', pickup_date, delivery_method_value))
  );

  SELECT setting_value INTO settings
  FROM public.business_settings
  WHERE setting_key = 'daily_capacity';

  default_limit := COALESCE((settings->>'default_limit')::INTEGER, 5);
  special_limit := (settings->'special_dates'->>pickup_date::TEXT)::INTEGER;
  final_limit := COALESCE(special_limit, default_limit);

  SELECT COUNT(*) INTO current_orders
  FROM public.orders
  WHERE left(pickup_time::TEXT, 10) = pickup_date::TEXT
    AND delivery_method = delivery_method_value
    AND status NOT IN ('cancelled');

  IF current_orders >= final_limit THEN
    RAISE EXCEPTION '當日已達產能上限 (%/%).', current_orders, final_limit
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.orders (
    order_id,
    customer_name,
    phone,
    email,
    pickup_time,
    items,
    total_price,
    promo_code,
    discount_amount,
    original_price,
    final_price,
    payment_date,
    linepay_transaction_id,
    delivery_method,
    delivery_address,
    delivery_fee,
    delivery_notes,
    mbti_type,
    from_mbti_test,
    checkout_site,
    source_from,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    user_id,
    status
  )
  SELECT
    payload.order_id,
    payload.customer_name,
    payload.phone,
    payload.email,
    payload.pickup_time,
    payload.items,
    payload.total_price,
    payload.promo_code,
    payload.discount_amount,
    payload.original_price,
    payload.final_price,
    payload.payment_date,
    payload.linepay_transaction_id,
    payload.delivery_method,
    payload.delivery_address,
    payload.delivery_fee,
    payload.delivery_notes,
    payload.mbti_type,
    payload.from_mbti_test,
    payload.checkout_site,
    payload.source_from,
    payload.utm_source,
    payload.utm_medium,
    payload.utm_campaign,
    payload.utm_content,
    payload.utm_term,
    payload.user_id,
    payload.status
  FROM jsonb_to_record(order_payload) AS payload(
    order_id TEXT,
    customer_name TEXT,
    phone TEXT,
    email TEXT,
    pickup_time TEXT,
    items JSONB,
    total_price NUMERIC,
    promo_code TEXT,
    discount_amount NUMERIC,
    original_price NUMERIC,
    final_price NUMERIC,
    payment_date TIMESTAMPTZ,
    linepay_transaction_id TEXT,
    delivery_method TEXT,
    delivery_address TEXT,
    delivery_fee NUMERIC,
    delivery_notes TEXT,
    mbti_type TEXT,
    from_mbti_test BOOLEAN,
    checkout_site TEXT,
    source_from TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    user_id UUID,
    status TEXT
  )
  RETURNING * INTO inserted_order;

  RETURN inserted_order;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_order_with_capacity_check(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_order_with_capacity_check(JSONB) TO service_role;

COMMENT ON FUNCTION public.insert_order_with_capacity_check(JSONB)
  IS '在交易鎖內檢查每日產能並建立 Shop 訂單，避免併發超賣名額';
