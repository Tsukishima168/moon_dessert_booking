-- =============================================================
-- 2026-04-07 菜單資料對齊層
-- 目的：建立三邊（map / shop / MBTI）命名統一的橋接表
--       不動現有 menu_items、mbti_recommendations 等表
-- =============================================================

-- -------------------------------------------------------------
-- 1. menu_item_aliases
--    記錄各站使用的別名 → 對應到 shop menu_items.id
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_item_aliases (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  UUID        NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  source_system TEXT        NOT NULL,   -- 'map' | 'mbti' | 'legacy'
  alias_name    TEXT        NOT NULL,
  alias_kind    TEXT        NOT NULL DEFAULT 'display',
                                        -- 'display' | 'legacy' | 'soul_dessert'
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, alias_name)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_aliases_item
  ON public.menu_item_aliases (menu_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_aliases_source
  ON public.menu_item_aliases (source_system, is_active);

ALTER TABLE public.menu_item_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read menu_item_aliases"
  ON public.menu_item_aliases FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to menu_item_aliases"
  ON public.menu_item_aliases FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin' OR (SELECT auth.uid()) IS NULL);

COMMENT ON TABLE  public.menu_item_aliases             IS '各站商品別名 → shop menu_items 的橋接表';
COMMENT ON COLUMN public.menu_item_aliases.source_system IS 'map | mbti | legacy';
COMMENT ON COLUMN public.menu_item_aliases.alias_kind    IS 'display | legacy | soul_dessert';

-- -------------------------------------------------------------
-- 2. mbti_menu_links
--    16 個 MBTI 類型與 shop 商品的正式連結（比 mbti_recommendations 更豐富）
--    mbti_recommendations 保持不動（shop 內部仍在用）
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mbti_menu_links (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mbti_type                    TEXT        NOT NULL UNIQUE,
  menu_item_id                 UUID        REFERENCES public.menu_items(id) ON DELETE SET NULL,
  linkage_type                 TEXT        NOT NULL DEFAULT 'unresolved',
                                           -- 'exact' | 'theme_match' | 'seasonal' | 'retired' | 'unresolved'
  soul_dessert_name            TEXT        NOT NULL,  -- MBTI 對外呈現的甜點名稱
  display_name_override        TEXT,                   -- 若需要覆寫呈現名稱
  display_description_override TEXT,
  priority                     INTEGER     NOT NULL DEFAULT 0,
  is_active                    BOOLEAN     NOT NULL DEFAULT TRUE,
  notes                        TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mbti_menu_links_type
  ON public.mbti_menu_links (mbti_type, is_active);

CREATE INDEX IF NOT EXISTS idx_mbti_menu_links_item
  ON public.mbti_menu_links (menu_item_id);

ALTER TABLE public.mbti_menu_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read mbti_menu_links"
  ON public.mbti_menu_links FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to mbti_menu_links"
  ON public.mbti_menu_links FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin' OR (SELECT auth.uid()) IS NULL);

COMMENT ON TABLE  public.mbti_menu_links              IS 'MBTI 靈魂甜點 → shop 商品正式連結表；mbti_recommendations 為舊表保持不動';
COMMENT ON COLUMN public.mbti_menu_links.linkage_type IS 'exact | theme_match | seasonal | retired | unresolved';
COMMENT ON COLUMN public.mbti_menu_links.soul_dessert_name IS 'MBTI 結果頁對外呈現名稱（不等於 shop canonical name）';

-- -------------------------------------------------------------
-- 3. Backfill mbti_menu_links（16 種 MBTI）
--    用 subquery 按 shop canonical name 查 menu_item_id
--    若商品不存在，仍插入 row，menu_item_id = NULL，linkage_type = unresolved
-- -------------------------------------------------------------

-- --- 10 個 exact / 高信心 mapped ---

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'INTJ',
       (SELECT id FROM public.menu_items WHERE name = '北海道經典｜巴斯克乳酪' LIMIT 1),
       'exact', '北海道經典巴斯克', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'INTP',
       (SELECT id FROM public.menu_items WHERE name = '檸檬日本柚子｜千層蛋糕' LIMIT 1),
       'exact', '檸檬柚子千層蛋糕', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ENTJ',
       (SELECT id FROM public.menu_items WHERE name = '貝里詩奶酒｜提拉米蘇' LIMIT 1),
       'exact', '奶酒提拉米蘇', '商業命名差異，內容同品'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ENTP',
       (SELECT id FROM public.menu_items WHERE name = '日本柚子蘋果乳酪｜提拉米蘇' LIMIT 1),
       'exact', '柚子蘋果提拉米蘇', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ISTJ',
       (SELECT id FROM public.menu_items WHERE name = '北海道十勝低糖原味｜千層蛋糕' LIMIT 1),
       'exact', '經典十勝原味千層', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ISFJ',
       (SELECT id FROM public.menu_items WHERE name = '經典烤布丁｜乾濕分離' LIMIT 1),
       'exact', '經典烤布丁', '商業命名差異'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ESTJ',
       (SELECT id FROM public.menu_items WHERE name = '鹹蛋黃｜巴斯克乳酪' LIMIT 1),
       'exact', '鹹蛋黃巴斯克', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ISTP',
       (SELECT id FROM public.menu_items WHERE name = '經典｜提拉米蘇' LIMIT 1),
       'exact', '經典提拉米蘇', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ISFP',
       (SELECT id FROM public.menu_items WHERE name = '小山園抹茶｜提拉米蘇' LIMIT 1),
       'exact', '抹茶提拉米蘇', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ESTP',
       (SELECT id FROM public.menu_items WHERE name = '巧克力布朗尼｜千層蛋糕' LIMIT 1),
       'exact', '巧克力布朗尼千層', '高信心'
ON CONFLICT (mbti_type) DO NOTHING;

-- --- 1 個 approx_only（ESFJ）---

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
SELECT 'ESFJ',
       (SELECT id FROM public.menu_items WHERE name = '莓果巧克力｜戚風蛋糕' LIMIT 1),
       'theme_match', '莓果戚風蛋糕', '名稱不完全一致，待人工確認是否同品'
ON CONFLICT (mbti_type) DO NOTHING;

-- --- 1 個 seasonal_or_split（ENFP）---

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
VALUES (
  'ENFP', NULL, 'seasonal',
  '草莓莓果千層蛋糕',
  '對應 shop 草莓季節品（目前 OFF）；ON 時需人工補 menu_item_id'
)
ON CONFLICT (mbti_type) DO NOTHING;

-- --- 4 個 unresolved（待決策）---

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
VALUES (
  'INFJ', NULL, 'unresolved',
  '茶香巴斯克',
  'shop 目前無茶香/伯爵巴斯克品項；待商業確認後補 link'
)
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
VALUES (
  'INFP', NULL, 'unresolved',
  '北海道十勝戚風蛋糕',
  'shop 無原味戚風 canonical 品；待確認'
)
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
VALUES (
  'ENFJ', NULL, 'unresolved',
  '檸檬蘋果戚風蛋糕',
  'shop 無此品；待確認是否新增商品或改 soul_dessert_name'
)
ON CONFLICT (mbti_type) DO NOTHING;

INSERT INTO public.mbti_menu_links
  (mbti_type, menu_item_id, linkage_type, soul_dessert_name, notes)
VALUES (
  'ESFP', NULL, 'unresolved',
  '綜合水果戚風蛋糕',
  'shop 無此品；可能對應草莓戚風季節品，待確認'
)
ON CONFLICT (mbti_type) DO NOTHING;

-- -------------------------------------------------------------
-- 4. Backfill menu_item_aliases — map static → shop canonical
--    只回填 exactish（高信心），approx_only 待人工確認後再填
-- -------------------------------------------------------------

-- tiramisu 類
INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '經典提拉米蘇', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '經典｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '烤焦糖布丁摩卡米蘇', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '烤焦糖布丁摩卡｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '小山園抹茶米蘇', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '小山園抹茶｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '日本柚子蘋果乳酪米蘇', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '日本柚子蘋果乳酪｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '奶酒提拉米蘇', 'display', 'exactish — 商業命名改版'
FROM public.menu_items WHERE name = '貝里詩奶酒｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

-- basque 類
INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '原味巴斯克', 'display', 'exactish — 商業命名改版'
FROM public.menu_items WHERE name = '北海道經典｜巴斯克乳酪' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '檸檬巴斯克', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '檸檬｜巴斯克乳酪' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '鹹蛋黃巴斯克', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '鹹蛋黃｜巴斯克乳酪' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

-- chiffon 類
INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '莓果巧克力戚風蛋糕', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '莓果巧克力｜戚風蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '烤焦糖布丁戚風蛋糕', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '烤焦糖布丁｜戚風蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

-- mille_crepe 類
INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '北海道十勝低糖原味千層', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '北海道十勝低糖原味｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '法芙娜巧克力布朗尼千層', 'display', 'exactish — 商業命名簡化'
FROM public.menu_items WHERE name = '巧克力布朗尼｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '檸檬日本柚子千層', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '檸檬日本柚子｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '蜜香紅茶拿鐵千層', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '蜜香紅茶拿鐵｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

-- pudding 類
INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '布丁', 'display', 'exactish — shop 命名更完整'
FROM public.menu_items WHERE name = '經典烤布丁｜乾濕分離' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

-- drinks 類
INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '美式咖啡', 'display', 'exactish — 格式差異'
FROM public.menu_items WHERE name = '經典美式咖啡' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '日本柚子美式', 'display', 'exactish — 完全一致'
FROM public.menu_items WHERE name = '日本柚子美式' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '烤布丁拿鐵', 'display', 'exactish — 行銷命名差異'
FROM public.menu_items WHERE name = '來一顆烤布丁拿鐵' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '博士茶', 'display', 'exactish — 完全一致'
FROM public.menu_items WHERE name = '博士茶' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'map', '蕎麥茶', 'display', 'exactish — 行銷命名差異'
FROM public.menu_items WHERE name = '黃金蕎麥茶' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

-- -------------------------------------------------------------
-- 5. Backfill menu_item_aliases — MBTI soul dessert → shop canonical
--    只回填 10 個 exact mapped，unresolved 先不填
-- -------------------------------------------------------------

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '北海道經典巴斯克', 'soul_dessert', 'INTJ'
FROM public.menu_items WHERE name = '北海道經典｜巴斯克乳酪' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '檸檬柚子千層蛋糕', 'soul_dessert', 'INTP'
FROM public.menu_items WHERE name = '檸檬日本柚子｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '奶酒提拉米蘇', 'soul_dessert', 'ENTJ'
FROM public.menu_items WHERE name = '貝里詩奶酒｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '柚子蘋果提拉米蘇', 'soul_dessert', 'ENTP'
FROM public.menu_items WHERE name = '日本柚子蘋果乳酪｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '經典十勝原味千層', 'soul_dessert', 'ISTJ'
FROM public.menu_items WHERE name = '北海道十勝低糖原味｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '經典烤布丁', 'soul_dessert', 'ISFJ'
FROM public.menu_items WHERE name = '經典烤布丁｜乾濕分離' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '鹹蛋黃巴斯克', 'soul_dessert', 'ESTJ'
FROM public.menu_items WHERE name = '鹹蛋黃｜巴斯克乳酪' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '經典提拉米蘇', 'soul_dessert', 'ISTP'
FROM public.menu_items WHERE name = '經典｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '抹茶提拉米蘇', 'soul_dessert', 'ISFP'
FROM public.menu_items WHERE name = '小山園抹茶｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '巧克力布朗尼千層', 'soul_dessert', 'ESTP'
FROM public.menu_items WHERE name = '巧克力布朗尼｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;
