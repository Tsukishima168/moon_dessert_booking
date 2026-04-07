-- Banner 系統資料表
-- 用於管理首頁 Banner 和促銷活動

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 內容
  title TEXT NOT NULL,                       -- Banner 標題
  description TEXT,                          -- 副標題/描述
  image_url TEXT,                            -- Banner 圖片 URL (選填)
  link_url TEXT,                             -- 點擊後跳轉連結 (選填)
  link_text TEXT DEFAULT '立即查看',         -- 按鈕文字
  
  -- 樣式
  background_color TEXT DEFAULT '#d4a574',   -- 背景色 (Moon Moon accent)
  text_color TEXT DEFAULT '#0a0a0a',         -- 文字色
  
  -- 顯示控制
  is_active BOOLEAN DEFAULT false,           -- 是否啟用
  priority INTEGER DEFAULT 0,                -- 優先順序 (越大越前面)
  display_type TEXT DEFAULT 'hero',          -- 類型: hero, announcement
  
  -- 時間控制
  start_date TIMESTAMPTZ,                    -- 開始顯示時間 (NULL = 立即開始)
  end_date TIMESTAMPTZ,                      -- 結束顯示時間 (NULL = 永久顯示)
  
  -- 統計
  view_count INTEGER DEFAULT 0,              -- 顯示次數
  click_count INTEGER DEFAULT 0,             -- 點擊次數
  
  -- 元數據
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners(start_date, end_date);

-- RLS 政策（後台管理需要）
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取啟用的 Banner
CREATE POLICY "Banners are viewable by everyone" 
  ON banners FOR SELECT 
  USING (is_active = true);

-- 註解
COMMENT ON TABLE banners IS '首頁 Banner 和促銷活動管理';
COMMENT ON COLUMN banners.priority IS '數字越大優先級越高,多個 Banner 時按此排序';
COMMENT ON COLUMN banners.display_type IS 'hero: 大型橫幅, announcement: 頂部公告條';
COMMENT ON COLUMN banners.view_count IS 'Banner 被顯示的次數';
COMMENT ON COLUMN banners.click_count IS 'Banner 被點擊的次數';
