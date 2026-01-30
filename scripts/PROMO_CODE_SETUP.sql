-- ============================================
-- 優惠碼系統資料表設定
-- ============================================

-- 1. 創建優惠碼資料表
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 更新訂單資料表，新增優惠碼相關欄位
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC,
  ADD COLUMN IF NOT EXISTS final_price NUMERIC;

-- 3. 創建索引以提高查詢效率
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_promo_code ON orders(promo_code);

-- 4. 設定 RLS (Row Level Security)
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- 允許匿名用戶查詢有效的優惠碼（僅用於驗證）
CREATE POLICY "Allow anonymous to validate promo codes"
  ON promo_codes
  FOR SELECT
  TO anon
  USING (
    is_active = true 
    AND valid_from <= NOW() 
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

-- 允許已認證用戶查看所有優惠碼（管理用）
CREATE POLICY "Allow authenticated to view all promo codes"
  ON promo_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- 允許已認證用戶新增/編輯優惠碼（管理用）
CREATE POLICY "Allow authenticated to manage promo codes"
  ON promo_codes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 範例優惠碼資料
-- ============================================

-- 插入一些測試優惠碼
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_amount, max_uses, description, valid_until)
VALUES
  -- 百分比折扣
  ('WELCOME10', 'percentage', 10, 0, NULL, '新客戶10%折扣', NOW() + INTERVAL '30 days'),
  ('SAVE20', 'percentage', 20, 500, 100, '滿500享8折', NOW() + INTERVAL '60 days'),
  
  -- 固定金額折扣
  ('FIRST50', 'fixed', 50, 300, 50, '首購折50元', NOW() + INTERVAL '30 days'),
  ('MOON100', 'fixed', 100, 1000, NULL, '滿1000折100', NOW() + INTERVAL '90 days')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 查詢優惠碼的函數
-- ============================================

-- 驗證並使用優惠碼的函數
CREATE OR REPLACE FUNCTION validate_and_use_promo_code(
  p_code TEXT,
  p_order_amount NUMERIC
)
RETURNS TABLE (
  valid BOOLEAN,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  final_amount NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_discount NUMERIC;
BEGIN
  -- 查詢優惠碼
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = p_code
    AND is_active = true
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW());

  -- 如果找不到優惠碼
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      NULL::TEXT, 
      NULL::NUMERIC, 
      0::NUMERIC, 
      p_order_amount, 
      '優惠碼無效或已過期'::TEXT;
    RETURN;
  END IF;

  -- 檢查最低消費金額
  IF p_order_amount < v_promo.min_order_amount THEN
    RETURN QUERY SELECT 
      false, 
      NULL::TEXT, 
      NULL::NUMERIC, 
      0::NUMERIC, 
      p_order_amount, 
      format('此優惠碼需消費滿 $%s', v_promo.min_order_amount)::TEXT;
    RETURN;
  END IF;

  -- 檢查使用次數限制
  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
    RETURN QUERY SELECT 
      false, 
      NULL::TEXT, 
      NULL::NUMERIC, 
      0::NUMERIC, 
      p_order_amount, 
      '優惠碼已達使用上限'::TEXT;
    RETURN;
  END IF;

  -- 計算折扣金額
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := ROUND(p_order_amount * v_promo.discount_value / 100, 0);
  ELSE -- fixed
    v_discount := v_promo.discount_value;
  END IF;

  -- 確保折扣不超過訂單金額
  IF v_discount > p_order_amount THEN
    v_discount := p_order_amount;
  END IF;

  -- 更新使用次數
  UPDATE promo_codes 
  SET used_count = used_count + 1 
  WHERE code = p_code;

  -- 返回驗證結果
  RETURN QUERY SELECT 
    true, 
    v_promo.discount_type, 
    v_promo.discount_value, 
    v_discount, 
    p_order_amount - v_discount,
    '優惠碼已成功套用'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 完成！
-- ============================================
-- 請在 Supabase SQL Editor 執行此腳本
-- 然後就可以使用優惠碼系統了！
