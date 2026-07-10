-- =============================================================
-- 2026-07-10 商品內容欄位擴充（P0-2）
-- 目的：shop 從「點餐頁」升級成電商，商品需要成分/過敏原/保存/
--       配送/檔期等結構化資訊，供未來商品詳情頁 /product/[slug] 使用
-- 規格來源：CONTENT_ARCHITECTURE_PLAN_2026-07-10.md「P0-2 商品欄位擴充」表
-- 原則：全部 nullable、additive，不動既有資料、不改既有欄位
-- =============================================================

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS size_info TEXT,
  ADD COLUMN IF NOT EXISTS ingredients TEXT[],
  ADD COLUMN IF NOT EXISTS allergens TEXT[],
  ADD COLUMN IF NOT EXISTS storage_info TEXT,
  ADD COLUMN IF NOT EXISTS delivery_type TEXT,
  ADD COLUMN IF NOT EXISTS lead_time_days INT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[],
  ADD COLUMN IF NOT EXISTS included_items TEXT,
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 內容欄位約束：以 catalog guard 建立，避免 PostgreSQL 不支援的
-- ADD CONSTRAINT IF NOT EXISTS，也避免重跑時先 DROP 造成不必要的鎖定空窗。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_delivery_type_check'
      AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_delivery_type_check
      CHECK (delivery_type IS NULL OR delivery_type IN ('pickup_only', 'delivery_ok', 'both'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_lead_time_days_check'
      AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_lead_time_days_check
      CHECK (lead_time_days IS NULL OR lead_time_days >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_availability_window_check'
      AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_availability_window_check
      CHECK (
        available_from IS NULL
        OR available_until IS NULL
        OR available_from <= available_until
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_slug_format_check'
      AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_slug_format_check
      CHECK (
        slug IS NULL
        OR (
          char_length(slug) <= 100
          AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        )
      );
  END IF;
END $$;

-- slug 唯一索引（nullable：允許多筆 NULL 共存，僅非 NULL 值強制唯一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_slug_unique
  ON public.menu_items (slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.menu_items.tagline IS '賣點副標，如「品名｜賣點一句話」';
COMMENT ON COLUMN public.menu_items.size_info IS '尺寸/份量說明';
COMMENT ON COLUMN public.menu_items.ingredients IS '成分列表（結構化，取代 ponpie 散落文字）';
COMMENT ON COLUMN public.menu_items.allergens IS '過敏原列表（結構化，可篩選標籤）';
COMMENT ON COLUMN public.menu_items.storage_info IS '保存方式/期限，如「冷藏3日」';
COMMENT ON COLUMN public.menu_items.delivery_type IS '配送方式：pickup_only / delivery_ok / both';
COMMENT ON COLUMN public.menu_items.lead_time_days IS '預購前置天數';
COMMENT ON COLUMN public.menu_items.gallery_urls IS '多圖網址陣列（現行 image_url 僅單張）';
COMMENT ON COLUMN public.menu_items.included_items IS '附贈品項，如插卡/蠟燭/提袋';
COMMENT ON COLUMN public.menu_items.available_from IS '檔期起始，供 Product JSON-LD priceValidUntil 綁定';
COMMENT ON COLUMN public.menu_items.available_until IS '檔期截止，供 Product JSON-LD priceValidUntil 綁定';
COMMENT ON COLUMN public.menu_items.slug IS '商品詳情頁網址代稱，/product/[slug] 使用';
