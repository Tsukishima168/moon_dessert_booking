-- ============================================
-- 宅配功能資料表設定
-- ============================================

-- 1. 更新訂單資料表，新增宅配相關欄位
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'pickup' 
    CHECK (delivery_method IN ('pickup', 'delivery')),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON orders(delivery_method);

-- 3. 建立運費設定表（可選，方便未來調整運費規則）
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  delivery_fee NUMERIC NOT NULL,
  free_shipping_threshold NUMERIC,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 插入預設運費設定
INSERT INTO delivery_settings (name, min_order_amount, delivery_fee, free_shipping_threshold, is_active)
VALUES
  ('標準宅配', 0, 150, 2000, true)
ON CONFLICT DO NOTHING;

-- 5. 設定 RLS（如果需要）
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous to view active delivery settings"
  ON delivery_settings
  FOR SELECT
  TO anon
  USING (
    is_active = true 
    AND valid_from <= NOW() 
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

-- ============================================
-- 完成！
-- ============================================
-- 現在 orders 表支援：
-- - delivery_method: 'pickup' 或 'delivery'
-- - delivery_address: 宅配地址
-- - delivery_fee: 運費金額
-- - delivery_notes: 宅配備註
