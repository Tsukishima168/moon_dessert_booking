-- 營業設定資料表
-- 用於管理預訂規則、產能限制等營業參數

CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入預設設定
INSERT INTO business_settings (setting_key, setting_value, description) VALUES
  (
    'reservation_rules',
    '{
      "min_advance_days": 3,
      "max_advance_days": 30,
      "allow_rush_orders": false,
      "rush_order_fee_percentage": 20
    }'::jsonb,
    '預訂規則: 最少提前天數、最多提前天數、是否接受急單、急單加價百分比'
  ),
  (
    'daily_capacity',
    '{
      "default_limit": 5,
      "special_dates": {}
    }'::jsonb,
    '每日產能: 一般日接單上限、特殊日期設定'
  ),
  (
    'business_hours',
    '{
      "weekday_hours": "10:00-18:00",
      "weekend_hours": "10:00-18:00",
      "closed_days": [0],
      "special_closures": []
    }'::jsonb,
    '營業時間: 平日、週末、固定公休日(0=週日)、特殊公休日'
  ),
  (
    'delivery_settings',
    '{
      "pickup_available": true,
      "delivery_available": true,
      "delivery_fee": 100,
      "free_delivery_threshold": 1000,
      "delivery_areas": ["台南市"]
    }'::jsonb,
    '配送設定: 自取、宅配、運費、免運門檻、配送區域'
  )
ON CONFLICT (setting_key) DO NOTHING;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_business_settings_key ON business_settings(setting_key);

-- RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- 所有人可讀取設定
DROP POLICY IF EXISTS "Settings are viewable by everyone" ON business_settings;
CREATE POLICY "Settings are viewable by everyone" 
  ON business_settings FOR SELECT 
  USING (true);

-- 只有管理員可更新(透過 service role)
DROP POLICY IF EXISTS "Settings are updatable by service role only" ON business_settings;
CREATE POLICY "Settings are updatable by service role only" 
  ON business_settings FOR UPDATE 
  USING (false);

COMMENT ON TABLE business_settings IS '營業設定參數表';
