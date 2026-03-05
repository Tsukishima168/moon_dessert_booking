# Banner 系統  - 資料庫設置指南

## 📐 Banner 圖片尺寸建議

| 類型 | 畫面上顯示尺寸 | 建議上傳尺寸 | 備註 |
|------|----------------|--------------|------|
| **hero**（大型橫幅） | 桌機：**96 × 96 px**（左側小圖） | **800 × 800 px** 或以上 | 正方形，用 `object-cover` 裁切；手機不顯示圖片 |
| **announcement**（頂部公告條） | 無圖片，僅文字 | — | 不顯示圖片 |

- 上傳圖片建議 **至少 400 × 400 px**，畫質較佳。
- 若未來改為全寬橫幅圖，可改用 **1200 × 400 px**（約 3:1）並需調整前端樣式。

---

## 📋 需要執行的 SQL (在 Supabase Dashboard)

您需要在 Supabase SQL Editor 執行以下 3 個檔案:

### 1. 建立 banners 資料表

```sql
-- 檔案: supabase/migrations/20260129_create_banners.sql

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 內容
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  link_text TEXT DEFAULT '立即查看',
  
  -- 樣式
  background_color TEXT DEFAULT '#d4a574',
  text_color TEXT DEFAULT '#0a0a0a',
  
  -- 顯示控制
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  display_type TEXT DEFAULT 'hero',
  
  -- 時間控制
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- 統計
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- 元數據
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners(start_date, end_date);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Banners are viewable by everyone" 
  ON banners FOR SELECT 
  USING (is_active = true);
```

### 2. 建立統計 RPC 函式

```sql
-- 檔案: supabase/migrations/20260129_banner_rpc_functions.sql

CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners
  SET view_count = view_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners
  SET click_count = click_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_banner_views TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_banner_clicks TO anon, authenticated;
```

### 3. 插入測試資料 (選用)

```sql
-- 測試資料: 情人節活動 Banner
INSERT INTO banners (
  title,
  description,
  background_color,
  text_color,
  is_active,
  priority,
  start_date,
  end_date
) VALUES (
  '🌹 情人節限定 - 草莓塔 85折',
  '2/14 前預訂享優惠,數量有限,售完為止',
  '#d4a574',
  '#0a0a0a',
  true,
  100,
  NOW(),
  '2026-02-14 23:59:59'
);
```

---

## 🚀 執行步驟

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 左側選單點擊 **SQL Editor**
4. 點擊 **New Query**
5. 貼上上面的 SQL (一次一個檔案)
6. 點擊 **Run** 執行

---

## ✅ 驗證安裝

執行完成後,確認:

```sql
-- 檢查資料表是否建立
SELECT * FROM banners;

-- 測試 RPC 函式
SELECT increment_banner_views('00000000-0000-0000-0000-000000000000');
```

應該不會報錯即成功! 🎉

---

## 📝 之後新增 Banner 的方法

### 方法 A: 直接在 SQL Editor 新增

```sql
INSERT INTO banners (
  title,
  description,
  is_active,
  priority
) VALUES (
  '您的 Banner 標題',
  '您的 Banner 描述',
  true,  -- 立即啟用
  100    -- 優先順序
);
```

### 方法 B: 使用後台管理 (Phase 2 完成後)

未來會有圖形化介面,直接在 `/admin/banners` 新增!

---

## 🎨 自訂樣式

```sql
UPDATE banners
SET 
  background_color = '#your-color',
  text_color = '#your-text-color'
WHERE id = 'banner-id';
```

---

需要協助?參考完整的 [banner_implementation_plan.md](file:///Users/penstudio/.gemini/antigravity/brain/2affbcbd-1d23-4dd4-abca-613ca7a85c81/banner_implementation_plan.md)
