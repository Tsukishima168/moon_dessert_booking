-- 匯出所有品項（用於整理照片與更新）
-- 在 Supabase SQL Editor 執行，結果可複製到試算表，再依「品項照片命名與更新指南」填建議檔名

SELECT
  ROW_NUMBER() OVER (ORDER BY mi.category, mi.name) AS "序號",
  mi.id,
  mi.name          AS "品名",
  mi.description   AS "說明",
  mi.category      AS "分類",
  mi.image_url     AS "目前圖片網址",
  mi.is_available  AS "是否上架"
FROM menu_items mi
ORDER BY mi.category, mi.name;
