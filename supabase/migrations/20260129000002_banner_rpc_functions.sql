-- Banner 統計 RPC 函式
-- 用於原子性更新 view_count 和 click_count

-- 增加 Banner 顯示次數
CREATE OR REPLACE FUNCTION public.increment_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.banners
  SET view_count = view_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- 增加 Banner 點擊次數
CREATE OR REPLACE FUNCTION public.increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.banners
  SET click_count = click_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- 授權執行權限
REVOKE ALL ON FUNCTION public.increment_banner_views(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_banner_clicks(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_banner_views(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_banner_clicks(UUID) TO anon, authenticated;
