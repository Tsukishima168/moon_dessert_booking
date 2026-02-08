-- 若 banners 表缺少 link_text 欄位，請先執行此檔
ALTER TABLE banners ADD COLUMN IF NOT EXISTS link_text TEXT DEFAULT '立即查看';
