-- 示範 Banner：讓您預覽首頁效果
-- 在 Supabase SQL Editor 執行此檔即可看到 Banner
--
-- ⚠️ 若出現 link_text 不存在錯誤，請「先」執行 ADD_BANNER_LINK_TEXT.sql

INSERT INTO banners (
  title,
  description,
  image_url,
  link_url,
  link_text,
  background_color,
  text_color,
  is_active,
  priority,
  display_type,
  start_date,
  end_date
) VALUES (
  '🌹 本季精選 · 草莓系列預訂中',
  '即日起預訂享早鳥優惠，限量供應',
  'https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png',
  '/',
  '逛逛甜點',
  '#d4a574',
  '#0a0a0a',
  true,
  100,
  'hero',
  NOW(),
  '2026-12-31 23:59:59'
);
