-- =============================================================
-- 2026-04-07 解決 4 個 unresolved MBTI 連結
-- 策略：改定位（theme_match）→ 接上現有商品，無需新增 menu_items
-- =============================================================
--
-- 商品對應：
--   INFJ  → 蜜香紅茶拿鐵｜千層蛋糕   （茶意 + 層次 = 深淵凝視者）
--   INFP  → 烤焦糖布丁｜戚風蛋糕     （輕盈藏溫熱 = 治癒系詩人）
--   ENFJ  → 烤焦糖布丁摩卡｜提拉米蘇  （tiramisu = 帶我向上，光輝導師）
--   ESFP  → 檸檬｜巴斯克乳酪         （焦糖外殼 + 酸亮登場 = 閃耀巨星）
-- =============================================================

-- INFJ
UPDATE public.mbti_menu_links
SET
  menu_item_id = (
    SELECT id FROM public.menu_items
    WHERE name = '蜜香紅茶拿鐵｜千層蛋糕' LIMIT 1
  ),
  soul_dessert_name            = '蜜香紅茶千層',
  display_description_override = '茶香在每一層奶霜之間靜靜流淌。你不是那種喧嘩的人——你是讓人回家後才想起來的那道餘韻。',
  linkage_type                 = 'theme_match',
  notes                        = '改定位 2026-04-07：茶意 × 層次感 對應深淵凝視者',
  updated_at                   = NOW()
WHERE mbti_type = 'INFJ';

-- INFP
UPDATE public.mbti_menu_links
SET
  menu_item_id = (
    SELECT id FROM public.menu_items
    WHERE name = '烤焦糖布丁｜戚風蛋糕' LIMIT 1
  ),
  soul_dessert_name            = '焦糖烤布丁戚風',
  display_description_override = '輕盈的蛋糕體裡藏著一顆焦糖的溫熱核心。你溫柔得像雲，卻比所有人都更真實地活著。',
  linkage_type                 = 'theme_match',
  notes                        = '改定位 2026-04-07：輕盈戚風 × 焦糖溫熱 對應治癒系詩人',
  updated_at                   = NOW()
WHERE mbti_type = 'INFP';

-- ENFJ
UPDATE public.mbti_menu_links
SET
  menu_item_id = (
    SELECT id FROM public.menu_items
    WHERE name = '烤焦糖布丁摩卡｜提拉米蘇' LIMIT 1
  ),
  soul_dessert_name            = '摩卡焦糖提拉米蘇',
  display_description_override = 'Tiramisu 在義大利文是「帶我向上」。你天生就是那個讓人感到被托舉的存在。摩卡的深沉，是你給予的溫度。',
  linkage_type                 = 'theme_match',
  notes                        = '改定位 2026-04-07：tiramisu 語源 = lift me up，完美呼應光輝導師',
  updated_at                   = NOW()
WHERE mbti_type = 'ENFJ';

-- ESFP
UPDATE public.mbti_menu_links
SET
  menu_item_id = (
    SELECT id FROM public.menu_items
    WHERE name = '檸檬｜巴斯克乳酪' LIMIT 1
  ),
  soul_dessert_name            = '檸檬巴斯克',
  display_description_override = '帶著焦糖外殼登場，酸亮得不留退路。你不需要宣告自己來了——整個場域早已感受到你的存在。',
  linkage_type                 = 'theme_match',
  notes                        = '改定位 2026-04-07：焦糖外殼 × 檸檬酸亮 對應閃耀巨星的登場感',
  updated_at                   = NOW()
WHERE mbti_type = 'ESFP';

-- =============================================================
-- 同步 mbti_aliases（新 soul_dessert 名稱）
-- =============================================================

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '蜜香紅茶千層', 'soul_dessert', 'INFJ — 改定位 2026-04-07'
FROM public.menu_items WHERE name = '蜜香紅茶拿鐵｜千層蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '焦糖烤布丁戚風', 'soul_dessert', 'INFP — 改定位 2026-04-07'
FROM public.menu_items WHERE name = '烤焦糖布丁｜戚風蛋糕' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '摩卡焦糖提拉米蘇', 'soul_dessert', 'ENFJ — 改定位 2026-04-07'
FROM public.menu_items WHERE name = '烤焦糖布丁摩卡｜提拉米蘇' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;

INSERT INTO public.menu_item_aliases (menu_item_id, source_system, alias_name, alias_kind, notes)
SELECT id, 'mbti', '檸檬巴斯克', 'soul_dessert', 'ESFP — 改定位 2026-04-07'
FROM public.menu_items WHERE name = '檸檬｜巴斯克乳酪' LIMIT 1
ON CONFLICT (source_system, alias_name) DO NOTHING;
