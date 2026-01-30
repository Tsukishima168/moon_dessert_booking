-- ========================================
-- MBTI 整合 - 資料表設定
-- ========================================

-- 1. 建立 MBTI 推薦資料表
CREATE TABLE IF NOT EXISTS mbti_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mbti_type TEXT NOT NULL,  -- 16 種 MBTI 類型（INFP, ENFJ, etc.）
  menu_item_id UUID NOT NULL,  -- 推薦的商品 ID
  reason TEXT,  -- 推薦理由（例如：「INFP 的你喜歡溫柔療癒的甜點」）
  priority INT DEFAULT 0,  -- 推薦優先順序（數字越大越優先）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- 2. 建立索引（加速查詢）
CREATE INDEX IF NOT EXISTS idx_mbti_type ON mbti_recommendations(mbti_type);
CREATE INDEX IF NOT EXISTS idx_mbti_priority ON mbti_recommendations(priority DESC);

-- 3. 在 orders 表加入 MBTI 欄位（如果還沒有）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mbti_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS from_mbti_test BOOLEAN DEFAULT false;

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_orders_mbti ON orders(mbti_type) WHERE mbti_type IS NOT NULL;

-- ========================================
-- 範例資料（示範用）
-- ========================================
-- 您可以根據實際商品 ID 調整

-- 範例：為 INFP 推薦商品
-- INSERT INTO mbti_recommendations (mbti_type, menu_item_id, reason, priority)
-- VALUES 
--   ('INFP', 'your-menu-item-id-here', '溫柔療癒，適合敏感細膩的你', 10),
--   ('INFP', 'another-item-id', '夢幻甜美，讓心靈得到撫慰', 8);

-- 範例：為 ENTJ 推薦商品
-- INSERT INTO mbti_recommendations (mbti_type, menu_item_id, reason, priority)
-- VALUES 
--   ('ENTJ', 'your-menu-item-id-here', '果斷有力，就像你的領導風格', 10);

-- ========================================
-- 查詢範例
-- ========================================

-- 查詢 INFP 的推薦商品
-- SELECT 
--   r.mbti_type,
--   m.name,
--   r.reason,
--   r.priority
-- FROM mbti_recommendations r
-- JOIN menu_items m ON r.menu_item_id = m.id
-- WHERE r.mbti_type = 'INFP'
-- ORDER BY r.priority DESC;

-- 統計各 MBTI 類型的訂單數量
-- SELECT 
--   mbti_type,
--   COUNT(*) as order_count,
--   SUM(total_price) as total_revenue
-- FROM orders
-- WHERE mbti_type IS NOT NULL
-- GROUP BY mbti_type
-- ORDER BY order_count DESC;

-- ========================================
-- 注意事項
-- ========================================
-- 1. 執行此 SQL 後，需要手動填入推薦資料
-- 2. 確保 menu_item_id 對應到實際存在的商品
-- 3. 16 種 MBTI 類型：
--    INTJ, INTP, ENTJ, ENTP
--    INFJ, INFP, ENFJ, ENFP
--    ISTJ, ISFJ, ESTJ, ESFJ
--    ISTP, ISFP, ESTP, ESFP
-- ========================================
