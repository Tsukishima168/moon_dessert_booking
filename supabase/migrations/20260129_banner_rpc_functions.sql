-- Banner 統計 RPC 函式
-- 用於原子性更新 view_count 和 click_count

-- 增加 Banner 顯示次數
CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners
  SET view_count = view_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加 Banner 點擊次數
CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners
  SET click_count = click_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授權執行權限
GRANT EXECUTE ON FUNCTION increment_banner_views TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_banner_clicks TO anon, authenticated;
