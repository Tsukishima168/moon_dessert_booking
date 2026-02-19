-- ========================================
-- Supabase 資料表設定 SQL
-- ========================================
-- 請在 Supabase Dashboard → SQL Editor 執行此腳本

-- 1. 建立 orders 資料表（訂單）
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  pickup_time TEXT NOT NULL,
  items JSONB NOT NULL,
  total_price NUMERIC NOT NULL,
  promo_code TEXT,
  discount_amount NUMERIC DEFAULT 0,
  original_price NUMERIC,
  final_price NUMERIC,
  payment_date TEXT,
  delivery_method TEXT DEFAULT 'pickup',
  delivery_address TEXT,
  delivery_fee NUMERIC DEFAULT 0,
  delivery_notes TEXT,
  mbti_type TEXT,
  from_mbti_test BOOLEAN DEFAULT false,
  source_from TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1 補齊欄位（如果舊表已存在）
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC,
  ADD COLUMN IF NOT EXISTS final_price NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS mbti_type TEXT,
  ADD COLUMN IF NOT EXISTS from_mbti_test BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_from TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

-- 2. 建立索引（加速查詢）
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 3. 啟用 Row Level Security（RLS）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. 建立政策：允許所有人插入訂單（公開 API）
CREATE POLICY "允許建立訂單"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5. 建立政策：允許已認證用戶查看所有訂單（管理用）
CREATE POLICY "允許管理員查看訂單"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. 建立政策：允許已認證用戶更新訂單狀態
CREATE POLICY "允許管理員更新訂單"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- ========================================
-- 注意事項：
-- ========================================
-- 您的 menu_items 和 menu_variants 資料表已經存在
-- 所以不需要再建立，只需要確認以下欄位：
--
-- menu_items:
--   - id (int or uuid)
--   - name (text)
--   - description (text)
--   - category (text)
--   - image_url (text)
--   - is_available (boolean)
--
-- menu_variants:
--   - id (int or uuid)
--   - menu_item_id (foreign key to menu_items.id)
--   - variant_name (text)
--   - price (int or numeric)
--
-- 如果欄位名稱不同，請告訴我，我會調整程式碼！
-- ========================================
