-- ============================================
-- 🔧 緊急修復: 後端 API 問題
-- ============================================
-- 執行位置: Supabase Dashboard → SQL Editor
-- ============================================

-- 問題 1: orders 表缺少 source_from 列
-- 解決方案: 補齊所有必要的欄位

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_from TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- 驗證所有欄位已存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 注意: 時區問題在 API 層面，不需要修改數據庫
-- 檢查 /api/check-capacity/route.ts 中的時區處理
