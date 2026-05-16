CREATE OR REPLACE FUNCTION public.check_menu_item_availability(
  menu_item_id_param UUID,
  delivery_date DATE,
  current_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_ts ALIAS FOR $3;
  availability RECORD;
  hours_until_delivery INTEGER;
  taipei_minutes INTEGER;
  from_minutes INTEGER;
  until_minutes INTEGER;
BEGIN
  IF menu_item_id_param IS NULL THEN
    RETURN jsonb_build_object('available', TRUE, 'reason', '無特殊限制');
  END IF;

  SELECT *
  INTO availability
  FROM public.menu_item_availability
  WHERE menu_item_id = menu_item_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', TRUE, 'reason', '無特殊限制');
  END IF;

  IF availability.is_available IS FALSE THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', '此項目已停止提供');
  END IF;

  IF COALESCE(availability.unavailable_dates, '{}'::TEXT[]) @> ARRAY[delivery_date::TEXT] THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', '此日期材料用盡或停止提供');
  END IF;

  IF availability.available_weekdays IS NOT NULL
    AND NOT (EXTRACT(DOW FROM delivery_date)::INT::TEXT = ANY(availability.available_weekdays))
  THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', '此項目在此日期不提供');
  END IF;

  hours_until_delivery := FLOOR(
    EXTRACT(EPOCH FROM ((delivery_date::TIMESTAMP AT TIME ZONE 'Asia/Taipei') - current_ts)) / 3600
  );

  IF COALESCE(availability.min_advance_hours, 0) > 0
    AND hours_until_delivery < availability.min_advance_hours
  THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', '訂單時間距離交付日期不足' || availability.min_advance_hours || '小時'
    );
  END IF;

  IF availability.available_from IS NOT NULL AND availability.available_until IS NOT NULL THEN
    taipei_minutes :=
      EXTRACT(HOUR FROM (current_ts AT TIME ZONE 'Asia/Taipei'))::INT * 60
      + EXTRACT(MINUTE FROM (current_ts AT TIME ZONE 'Asia/Taipei'))::INT;
    from_minutes := EXTRACT(HOUR FROM availability.available_from)::INT * 60
      + EXTRACT(MINUTE FROM availability.available_from)::INT;
    until_minutes := EXTRACT(HOUR FROM availability.available_until)::INT * 60
      + EXTRACT(MINUTE FROM availability.available_until)::INT;

    IF from_minutes <= until_minutes THEN
      IF taipei_minutes < from_minutes OR taipei_minutes > until_minutes THEN
        RETURN jsonb_build_object('available', FALSE, 'reason', '此項目目前不在開放訂購時間');
      END IF;
    ELSE
      IF taipei_minutes < from_minutes AND taipei_minutes > until_minutes THEN
        RETURN jsonb_build_object('available', FALSE, 'reason', '此項目目前不在開放訂購時間');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('available', TRUE, 'reason', '可預訂');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_dates(
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
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  check_date DATE;
  reservation RECORD;
  capacity RECORD;
BEGIN
  FOR check_date IN
    SELECT generate_series(start_date, end_date, '1 day'::INTERVAL)::DATE
  LOOP
    SELECT *
    INTO reservation
    FROM public.validate_reservation(check_date, FALSE)
    LIMIT 1;

    IF COALESCE(reservation.valid, FALSE) IS NOT TRUE THEN
      RETURN QUERY SELECT
        check_date,
        FALSE,
        COALESCE(reservation.reason, '此日期目前無法預訂'),
        'reservation'::TEXT,
        0,
        0;
      CONTINUE;
    END IF;

    SELECT *
    INTO capacity
    FROM public.check_daily_capacity(check_date, delivery_method_param)
    LIMIT 1;

    RETURN QUERY SELECT
      check_date,
      COALESCE(capacity.available, FALSE),
      COALESCE(capacity.reason, CASE WHEN COALESCE(capacity.available, FALSE) THEN '可預訂' ELSE '當日已達產能上限' END),
      CASE WHEN COALESCE(capacity.available, FALSE) THEN NULL ELSE 'capacity' END,
      COALESCE(capacity.current_count::INTEGER, 0),
      COALESCE(capacity.capacity_limit::INTEGER, 0);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_menu_item_availability(UUID, DATE, TIMESTAMP WITH TIME ZONE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_dates(DATE, DATE, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.check_menu_item_availability(UUID, DATE, TIMESTAMP WITH TIME ZONE) IS '檢查指定商品在指定日期是否可訂購';
COMMENT ON FUNCTION public.get_available_dates(DATE, DATE, TEXT) IS '取得指定日期範圍的可預訂日期與產能狀態';
