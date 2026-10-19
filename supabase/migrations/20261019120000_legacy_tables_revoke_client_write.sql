-- 2026-10-19：收緊舊表權限（shop_orders / shop_order_items / 三個 shop_* view / signage_items）
--
-- 背景（2026-10-19 正式庫唯讀查詢）：
--   四張舊表 RLS 皆已開啟，但 relacl 都是
--     {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}
--   且 anon / authenticated 另有「欄位層級」的 INSERT/SELECT/UPDATE/REFERENCES。
--   下面表層 REVOKE 之後再逐欄位 REVOKE（做法同 20261009000000_restrict_campaigns_access.sql）。
--   註：Postgres 的表層 REVOKE 會連動收回「同一授予者（owner）」授出的欄位授權，逐欄位 REVOKE 在那種情況下是保險；
--   兩者都清不掉「別的授予者」授出的授權，那種情況由 [4] 的事後檢查擋下。
--
--   - shop_orders（56 筆，含姓名／電話／email）與 shop_order_items（86 筆）：
--       policy「Anyone can insert shop orders」「Anyone can insert shop order items」
--       為 FOR INSERT TO public WITH CHECK (true)，任何人拿前端公開的 anon key 就能直接寫入。
--       沒有任何 repo 的 main 讀寫這兩張表或其 view；最後寫入者（map，service role）已於 5 月移除。
--   - shop_order_summary / shop_daily_sales / shop_product_performance：security_invoker view，
--       anon / authenticated 目前有 SELECT。表層權限收回後這些 view 對前端本來就讀不到，
--       這裡一併把 view 本身的授權（含欄位層級）收回，不留尾巴。
--   - signage_items：三條寫入 policy 為 TO public，只檢查 (SELECT auth.role()) = 'authenticated'，
--       所以任何登入使用者（passport 的 Google 登入與本專案共用）都能寫。
--       另一個 signage app 在瀏覽器以 anon key 讀這張表（patisserie-signage components/signage/Board.tsx:31），
--       所以 anon / authenticated 的 SELECT 必須保留，只收寫入。
--
-- 這支 migration 做的事（全部在同一個 transaction，可重複執行）：
--   1. shop_orders / shop_order_items：刪兩條 INSERT policy；從 PUBLIC、anon、authenticated 收回全部權限
--      （表層＋每個欄位）；不還給前端任何權限；service_role 保有 SELECT/INSERT/UPDATE/DELETE。
--   2. 三個 view：從 PUBLIC、anon、authenticated 收回全部權限（表層＋欄位）；view 不存在就略過。
--   3. signage_items：刪三條寫入 policy；從 PUBLIC、anon、authenticated 收回全部權限（表層＋欄位）後，
--      只把 SELECT 還給 anon、authenticated；保留 SELECT policy；service_role 保有完整權限。
--   4. 事後檢查：若 PUBLIC / anon / authenticated 在這些表或 view（表層或欄位）仍留有任何授權
--      （signage_items 的表層 SELECT 除外），直接 RAISE EXCEPTION，整個 transaction 回滾。
--      原因：REVOKE 只能清掉「表 owner 自己授出的」授權；若某筆授權的授予者是別的角色（例如曾被授與 grant option 的角色），
--      表層與逐欄位的 REVOKE 都清不掉它。這種情況寧可 migration 失敗並列出殘留項，也不要顯示成功卻留著洞。
--   不動：資料、table、trigger、view 定義、RLS 開關。不處理 campaigns（見下）。
--   shop_orders 上的 shop_profile_stats_trigger（update_shop_profile_stats，SECURITY INVOKER，寫 shop_profiles）
--   之後只會由 service_role 觸發，不受影響。
--
-- 與其他檔案的關係：
--   - campaigns 由 20261009000000_restrict_campaigns_access.sql 處理，該檔 2026-10-19 在正式庫尚未套用；
--     本檔不重複也不依賴它，但兩個都要套用才算收完。
--   - shop_* 與 signage_items 的 DDL 不在本 repo 的 migrations 內。表不存在時本檔會報錯並整段回滾
--     （刻意不靜默略過，避免套錯專案卻顯示成功）；只有 view 因為版本不一而允許略過。
--   - 注意：patisserie-signage 的 supabase_setup.sql 若被重新執行，會重新建立 signage_items 的寫入 policy 與授權，
--     等於把洞重新打開。重跑那份腳本之前先改掉它。
--
-- 回滾（只在確定要恢復舊行為時才用；舊行為就是上述漏洞）：
--   GRANT ALL ON TABLE public.shop_orders, public.shop_order_items TO anon, authenticated;
--   CREATE POLICY "Anyone can insert shop orders" ON public.shop_orders FOR INSERT TO public WITH CHECK (true);
--   CREATE POLICY "Anyone can insert shop order items" ON public.shop_order_items FOR INSERT TO public WITH CHECK (true);
--   GRANT SELECT ON public.shop_order_summary, public.shop_daily_sales, public.shop_product_performance TO anon, authenticated;
--   GRANT ALL ON TABLE public.signage_items TO anon, authenticated;
--   CREATE POLICY "Authenticated users can insert" ON public.signage_items FOR INSERT TO public
--     WITH CHECK ((SELECT auth.role()) = 'authenticated');
--   CREATE POLICY "Authenticated users can update" ON public.signage_items FOR UPDATE TO public
--     USING ((SELECT auth.role()) = 'authenticated');
--   CREATE POLICY "Authenticated users can delete" ON public.signage_items FOR DELETE TO public
--     USING ((SELECT auth.role()) = 'authenticated');
--   （原本的欄位層級授權用表層 GRANT ALL 即可涵蓋，不需逐欄位還原。）
--
-- Source only: 經核准的 migration 流程套用，不要在正式庫手動探測。

BEGIN;

-- [1] shop_orders / shop_order_items -----------------------------------------
DROP POLICY IF EXISTS "Anyone can insert shop orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Anyone can insert shop order items" ON public.shop_order_items;

DO $$
DECLARE
  tbl text;
  rel regclass;
  col record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['shop_orders', 'shop_order_items']
  LOOP
    rel := format('public.%I', tbl)::regclass;  -- 表不存在就在此丟錯、整段回滾
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);
    -- 逐欄位收回（保險；清不掉的授權由 [4] 攔截）。
    FOR col IN SELECT attname FROM pg_attribute
      WHERE attrelid = rel AND attnum > 0 AND NOT attisdropped
    LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated', col.attname, tbl);
    END LOOP;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', tbl);
  END LOOP;
END $$;

-- [2] views ------------------------------------------------------------------
DO $$
DECLARE
  vw text;
  rel regclass;
  col record;
BEGIN
  FOREACH vw IN ARRAY ARRAY['shop_order_summary', 'shop_daily_sales', 'shop_product_performance']
  LOOP
    rel := to_regclass(format('public.%I', vw));
    IF rel IS NULL THEN
      RAISE NOTICE 'view public.% does not exist, skipped', vw;
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', vw);
    FOR col IN SELECT attname FROM pg_attribute
      WHERE attrelid = rel AND attnum > 0 AND NOT attisdropped
    LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated', col.attname, vw);
    END LOOP;
  END LOOP;
END $$;

-- [3] signage_items ----------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.signage_items;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.signage_items;
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.signage_items;

DO $$
DECLARE
  rel regclass := 'public.signage_items'::regclass;  -- 表不存在就在此丟錯、整段回滾
  col record;
BEGIN
  REVOKE ALL PRIVILEGES ON TABLE public.signage_items FROM PUBLIC, anon, authenticated;
  FOR col IN SELECT attname FROM pg_attribute
    WHERE attrelid = rel AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.signage_items FROM PUBLIC, anon, authenticated', col.attname);
  END LOOP;
END $$;

-- signage app 以 anon key 在瀏覽器讀取，只還給 SELECT（RLS 的 SELECT policy 保留）。
GRANT SELECT ON TABLE public.signage_items TO anon, authenticated;
GRANT ALL ON TABLE public.signage_items TO service_role;

-- [4] 事後檢查 ---------------------------------------------------------------
DO $$
DECLARE
  leftover text;
BEGIN
  WITH rels AS (
    SELECT c.oid, c.relname::text AS relname, c.relacl FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relname::text = ANY (ARRAY['shop_orders', 'shop_order_items', 'signage_items',
                                       'shop_order_summary', 'shop_daily_sales', 'shop_product_performance'])
  ), entries AS (
    SELECT r.relname, NULL::text AS attname, x.grantee, x.privilege_type
    FROM rels r CROSS JOIN LATERAL aclexplode(r.relacl) x
    UNION ALL
    SELECT r.relname, a.attname::text, x.grantee, x.privilege_type
    FROM rels r JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped
    CROSS JOIN LATERAL aclexplode(a.attacl) x
  )
  SELECT string_agg(format('%s%s %s to %s', e.relname, COALESCE('.' || e.attname, ''), e.privilege_type,
                           COALESCE(ro.rolname, 'PUBLIC')), '; ' ORDER BY e.relname, e.attname, e.privilege_type)
  INTO leftover
  FROM entries e LEFT JOIN pg_roles ro ON ro.oid = e.grantee
  WHERE (e.grantee = 0 OR ro.rolname IN ('anon', 'authenticated'))
    AND NOT (e.relname = 'signage_items' AND e.attname IS NULL AND e.privilege_type = 'SELECT'
             AND ro.rolname IN ('anon', 'authenticated'));
  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'legacy tables still grant privileges to client roles (granted by a role other than the owner?): %', leftover;
  END IF;
END $$;

COMMIT;
