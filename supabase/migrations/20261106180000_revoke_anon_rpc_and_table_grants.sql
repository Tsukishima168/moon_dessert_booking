-- 2026-11-06：收回 anon 可呼叫的寫入型 RPC、trigger 函式的公開 EXECUTE、補 search_path、收掉敏感表多給的表層授權
--
-- 背景（2026-11-05 資安報告 + 2026-11-06 唯讀查詢正式庫 xlqwfaailjyvsycjnzkz，Postgres 17.6）：
--   1. insert_user_event_for_user(p_user_id…) 與 update_last_seen_for_user(p_user_id…) 是 SECURITY DEFINER，
--      內文直接信任參數 p_user_id、完全不看 auth.uid()，ACL 卻對 PUBLIC 開放（update_last_seen_for_user 另有 anon、
--      authenticated 的明確授權）。任何人拿前端公開的 anon key 就能：
--        - 替任一 UUID 偽造 user_events（order_placed／stamp_earned／gacha_played／map_checkin 還會觸發 pg_notify）；
--        - 改任一 profile 的 last_seen_at／last_seen_site／first_site。
--   2. handle_new_user／notify_key_event／update_invite_slots 是 trigger 函式（prorettype = trigger），
--      ACL 帶 PUBLIC EXECUTE，所以被 PostgREST 當成 RPC 列出（advisor：anon／authenticated_security_definer_function_executable）。
--   3. mbti.update_line_pay_orders_updated_at()、public._staff_auth_recent_failures(text, integer) 沒有固定 search_path
--      （advisor：function_search_path_mutable）。
--   4. daily_checkins／line_pay_orders／mbti_claims／quest_completions／special_eggs 對 anon、authenticated 的 relacl 是
--      arwdDxtm（全部權限，含 PG17 的 MAINTAIN），欄位層級沒有授權（pg_attribute.attacl 全為 NULL）。
--      這五張表 RLS 皆已開啟，PostgREST 路徑被 policy 擋住，屬縱深防禦缺口，不是現行可利用的洞。
--
-- 呼叫端盤點（五站 origin/main：kiwimu e02319b、shop 19ce035、passport 09bae56、gacha 12def9f、map 734e411；
--   另 grep 了 developing/、_Archive/；DB 內也查過沒有其他函式、trigger 引用這兩個函式）：
--   - insert_user_event_for_user：只有 shop src/modules/user-events/order-created.handler.ts:27，
--     用 createAdminClient()（lib/supabase-admin.ts，service role key）。收回安全。
--   - update_last_seen_for_user：只有 shop src/repositories/user.repository.ts:101 的 updateLastSeen(userId, site)，
--     用 createClient()（lib/supabase-server.ts：anon key + 登入客人的 cookie session，即 authenticated 身分），
--     所以 authenticated 不能收。目前 shop 沒有任何地方呼叫 updateLastSeen（死碼），
--     其他四站都是呼叫 update_last_seen(p_site)（內文用 auth.uid()），不受影響。
--   - handle_new_user 掛在 auth.users（on_auth_user_created）、notify_key_event 掛在 public.user_events、
--     update_invite_slots 掛在 public.invitations。Postgres 只在 CREATE TRIGGER 時檢查 EXECUTE，
--     trigger 觸發時不檢查，所以收回不影響觸發（本機隔離 PG17 實測過：觸發者沒有 EXECUTE，三個 trigger 照樣觸發）。
--   - 五張表的前端／server 使用（grep 同上五個 repo 的 origin/main）：
--       daily_checkins    passport src/lib/checkinService.ts：SELECT（:44）與 upsert（:78，onConflict device_id,checked_in_at）
--       mbti_claims       kiwimu utils/mbtiClaim.ts:33：insert；核銷走 SECURITY DEFINER 的 consume_mbti_claim()
--       line_pay_orders   kiwimu server/linePayOrderStore.ts：getUserAdminDb()（service role）
--       quest_completions、special_eggs：沒有任何 repo 的程式讀寫
--
-- 這支 migration 做的事（全部在同一個 transaction，可重複執行）：
--   [1] insert_user_event_for_user：從 PUBLIC、anon、authenticated 收回 EXECUTE，只留 service_role。
--   [2] update_last_seen_for_user：從 PUBLIC、anon 收回 EXECUTE，保留 authenticated、service_role；
--       用 CREATE OR REPLACE 加一道檢查：呼叫者不是 service role、而且 p_user_id 不是自己（auth.uid()）時，
--       直接 RETURN，不改資料（不丟錯，維持原本「查無列也不報錯」的呼叫契約）。
--       簽章、回傳型別、LANGUAGE、SECURITY DEFINER、search_path 設定都和 2026-11-06 的 pg_get_functiondef 一致，ACL 不變。
--       判斷 service role 的寫法沿用本庫既有做法 auth.role() = 'service_role'：
--         正式庫 policy「profiles: service role 全權限」「user_events: service role 全權限」「promo_codes」都是
--         (SELECT auth.role()) = 'service_role'；repo 內 20260318000000_phase1_unified_user_profile.sql:103、
--         20260318000001_phase2_user_events.sql:43 同樣寫法。
--         不用 current_user：SECURITY DEFINER 函式內 current_user 是函式 owner（postgres），看不出呼叫者。
--         （adjust_points 沒有 service role 判斷，只用 auth.uid()，所以不是這個寫法的出處。）
--       auth.uid() 為 NULL（沒帶 JWT）時也視為不是本人，一律不改資料。
--       行為表：service_role 任意 p_user_id 照舊更新；authenticated 且 p_user_id = 自己照舊更新；
--       authenticated 帶別人的 UUID → 靜默不動作；anon → permission denied（EXECUTE 已收回）。
--       注意：從 SQL editor／直連（沒有 JWT）呼叫會被當成「不是本人」而不動作，要手動修資料請直接寫 UPDATE。
--   [3] handle_new_user／notify_key_event／update_invite_slots：先確認 prorettype 是 trigger（不是就整段回滾），
--       再從 PUBLIC、anon、authenticated 收回 EXECUTE。service_role 與 owner 的授權不動。
--   [4] mbti.update_line_pay_orders_updated_at()、public._staff_auth_recent_failures(text, integer)：
--       ALTER FUNCTION … SET search_path = public。兩個函式內文已讀過：前者只用 NEW 與 now()，
--       後者的表名已寫成 public.staff_auth_attempts，其餘是 pg_catalog 的內建運算子，沒有依賴其他 schema 的非限定名稱。
--   [5] 五張敏感表，對 anon、authenticated 收回 TRUNCATE、REFERENCES、TRIGGER（PG17 另含 MAINTAIN；這四個沒有 RLS 可擋）。
--       INSERT／UPDATE／DELETE 只收「沒有任何 RLS policy 允許」且「沒有呼叫端使用」的：
--         daily_checkins    保留 SELECT、INSERT、UPDATE；收 DELETE。
--                           UPDATE 要留：passport 的 upsert 是 INSERT … ON CONFLICT DO UPDATE，
--                           Postgres 在執行前就檢查 UPDATE 權限，收掉會連第一次簽到都失敗。
--         mbti_claims       保留 SELECT、INSERT；收 UPDATE、DELETE。
--         quest_completions 保留 SELECT、INSERT；收 UPDATE、DELETE。
--         special_eggs      保留 SELECT；收 INSERT、UPDATE、DELETE。
--         line_pay_orders   保留 SELECT；收 INSERT、UPDATE、DELETE（RLS 開啟但沒有任何 policy，只有 service role 使用）。
--       SELECT 一律保留：沒有 SELECT policy 時是安靜回 0 筆，收掉會變成報錯。
--       不動：資料、policy、RLS 開關、trigger、service_role 的授權。
--       刻意不處理（範圍外）：profiles、point_transactions 的授權；daily_checkins／quest_completions／mbti_claims
--       恆真的 INSERT policy 與 daily_checkins 恆真的 SELECT policy（另案）。
--   [6] 事後檢查（任一項不過就 RAISE EXCEPTION，整個 transaction 回滾）：
--       函式 EXECUTE 矩陣、五張表的權限矩陣（含欄位層級與角色繼承；用 has_*_privilege 判斷）、兩個函式的 search_path。
--       寧可 migration 失敗並列出殘留項，也不要顯示成功卻留著洞。
--   BEGIN 後先設 lock_timeout = 5s，卡在別的長交易後面時快速失敗，不要排隊擋住前端查詢。
--
-- 套用後驗證：給調度者跑的唯讀 SELECT 腳本，每一列 pass = true 才算過。
-- 回滾：檔尾註解有完整 SQL（標記 ROLLBACK SQL BEGIN／END 之間，逐行去掉開頭的「-- 」即可執行）。
--
-- Source only: 經核准的 migration 流程套用，不要在正式庫手動探測。

BEGIN;
SET LOCAL lock_timeout = '5s';

-- [1] insert_user_event_for_user ----------------------------------------------
REVOKE ALL ON FUNCTION public.insert_user_event_for_user(uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_event_for_user(uuid, text, text, jsonb)
  TO service_role;

-- [2] update_last_seen_for_user -----------------------------------------------
REVOKE ALL ON FUNCTION public.update_last_seen_for_user(uuid, text, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_last_seen_for_user(uuid, text, timestamptz)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_last_seen_for_user(p_user_id uuid, p_site text, p_now timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 只有 service role 可以替別人更新；登入客人只能更新自己。沒帶 JWT（auth.uid() 為 NULL）也當作不是本人。
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()) THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    last_seen_at   = p_now,
    last_seen_site = p_site,
    first_site     = COALESCE(first_site, p_site)
  WHERE id = p_user_id;
END;
$function$;

-- [3] trigger 函式 ------------------------------------------------------------
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(f.sig, ', ' ORDER BY f.sig) INTO bad
  FROM (VALUES ('public.handle_new_user()'),
               ('public.notify_key_event()'),
               ('public.update_invite_slots()')) AS f(sig)
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(f.sig)
  WHERE p.oid IS NULL OR p.prorettype <> 'trigger'::regtype;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'expected trigger functions, but missing or not returning trigger: %', bad;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.handle_new_user()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_key_event()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_invite_slots()   FROM PUBLIC, anon, authenticated;

-- [4] 固定 search_path --------------------------------------------------------
ALTER FUNCTION mbti.update_line_pay_orders_updated_at() SET search_path = public;
ALTER FUNCTION public._staff_auth_recent_failures(text, integer) SET search_path = public;

-- [5] 敏感表的表層授權 --------------------------------------------------------
-- 先前 relacl：anon、authenticated 皆為 arwdDxtm（授予者 postgres）。表不存在就在此丟錯、整段回滾。
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.daily_checkins, public.line_pay_orders, public.mbti_claims, public.quest_completions, public.special_eggs
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN  -- MAINTAIN 是 PG17 才有的權限
    EXECUTE 'REVOKE MAINTAIN ON TABLE public.daily_checkins, public.line_pay_orders, public.mbti_claims, '
            'public.quest_completions, public.special_eggs FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

REVOKE DELETE                  ON TABLE public.daily_checkins    FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE          ON TABLE public.mbti_claims       FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE          ON TABLE public.quest_completions FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE  ON TABLE public.special_eggs      FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE  ON TABLE public.line_pay_orders   FROM PUBLIC, anon, authenticated;

-- [6] 事後檢查 ----------------------------------------------------------------
-- [6a] 函式 EXECUTE 矩陣（has_function_privilege 含 PUBLIC 與角色繼承）
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(format('%s anon=%s authenticated=%s service_role=%s (expected %s/%s/%s)',
                           e.sig,
                           has_function_privilege('anon', to_regprocedure(e.sig), 'EXECUTE'),
                           has_function_privilege('authenticated', to_regprocedure(e.sig), 'EXECUTE'),
                           has_function_privilege('service_role', to_regprocedure(e.sig), 'EXECUTE'),
                           e.anon_x, e.auth_x, e.svc_x), '; ' ORDER BY e.sig)
  INTO bad
  FROM (VALUES
    ('public.insert_user_event_for_user(uuid,text,text,jsonb)',   false, false, true),
    ('public.update_last_seen_for_user(uuid,text,timestamptz)',   false, true,  true),
    ('public.handle_new_user()',                                  false, false, true),
    ('public.notify_key_event()',                                 false, false, true),
    ('public.update_invite_slots()',                              false, false, true)
  ) AS e(sig, anon_x, auth_x, svc_x)
  WHERE to_regprocedure(e.sig) IS NULL
     OR has_function_privilege('anon', to_regprocedure(e.sig), 'EXECUTE') IS DISTINCT FROM e.anon_x
     OR has_function_privilege('authenticated', to_regprocedure(e.sig), 'EXECUTE') IS DISTINCT FROM e.auth_x
     OR has_function_privilege('service_role', to_regprocedure(e.sig), 'EXECUTE') IS DISTINCT FROM e.svc_x;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'function EXECUTE privileges are not as expected (granted by a role other than the owner?): %', bad;
  END IF;
END $$;

-- [6b] 兩個函式的 search_path
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(f.sig, ', ' ORDER BY f.sig) INTO bad
  FROM (VALUES ('mbti.update_line_pay_orders_updated_at()'),
               ('public._staff_auth_recent_failures(text,integer)')) AS f(sig)
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(f.sig)
  WHERE p.oid IS NULL OR NOT ('search_path=public' = ANY (COALESCE(p.proconfig, ARRAY[]::text[])));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'search_path is not pinned to public on: %', bad;
  END IF;
END $$;

-- [6c] 五張表的權限矩陣（anon、authenticated 各自；表層＋欄位層級＋經 PUBLIC／角色繼承）
DO $$
DECLARE
  bad text;
BEGIN
  WITH kept(tbl, privs) AS (VALUES
    ('public.daily_checkins',    ARRAY['SELECT', 'INSERT', 'UPDATE']),
    ('public.mbti_claims',       ARRAY['SELECT', 'INSERT']),
    ('public.quest_completions', ARRAY['SELECT', 'INSERT']),
    ('public.special_eggs',      ARRAY['SELECT']),
    ('public.line_pay_orders',   ARRAY['SELECT'])
  ), allp(priv) AS (
    SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
      || CASE WHEN current_setting('server_version_num')::int >= 170000 THEN ARRAY['MAINTAIN'] ELSE ARRAY[]::text[] END)
  ), roles(rolname) AS (VALUES ('anon'), ('authenticated'))
  SELECT string_agg(format('%s %s %s (expected %s)', r.rolname, k.tbl, p.priv, p.priv = ANY (k.privs)),
                    '; ' ORDER BY k.tbl, r.rolname, p.priv)
  INTO bad
  FROM kept k CROSS JOIN allp p CROSS JOIN roles r
  WHERE (CASE WHEN p.priv IN ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
              THEN has_any_column_privilege(r.rolname, k.tbl, p.priv)
              ELSE has_table_privilege(r.rolname, k.tbl, p.priv) END)
        IS DISTINCT FROM (p.priv = ANY (k.privs));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'table privileges are not as expected (granted by a role other than the owner, or inherited?): %', bad;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- 回滾 SQL（緊急用；原樣把 2026-11-06 查到的授權與函式內文還原，等於重新打開上述缺口）。
-- 標記 ROLLBACK SQL BEGIN／END 之間，逐行去掉開頭的「-- 」就是可直接執行的 SQL。
-- 原本的表層授權都是 arwdDxtm（= GRANT ALL），欄位層級沒有授權，不需逐欄位還原。
-- =============================================================================
-- >>> ROLLBACK SQL BEGIN
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
--
-- -- [1] insert_user_event_for_user：原 ACL = PUBLIC、postgres、authenticated、service_role
-- GRANT EXECUTE ON FUNCTION public.insert_user_event_for_user(uuid, text, text, jsonb) TO PUBLIC, authenticated, service_role;
--
-- -- [2] update_last_seen_for_user：原 ACL = PUBLIC、postgres、anon、authenticated、service_role；內文還原成沒有檢查的版本
-- GRANT EXECUTE ON FUNCTION public.update_last_seen_for_user(uuid, text, timestamptz) TO PUBLIC, anon, authenticated, service_role;
-- CREATE OR REPLACE FUNCTION public.update_last_seen_for_user(p_user_id uuid, p_site text, p_now timestamp with time zone DEFAULT now())
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   UPDATE public.profiles
--   SET
--     last_seen_at   = p_now,
--     last_seen_site = p_site,
--     first_site     = COALESCE(first_site, p_site)
--   WHERE id = p_user_id;
-- END;
-- $function$;
--
-- -- [3] trigger 函式：原 ACL = PUBLIC、postgres、service_role
-- GRANT EXECUTE ON FUNCTION public.handle_new_user()     TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.notify_key_event()    TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.update_invite_slots() TO PUBLIC;
--
-- -- [4] search_path：原本沒有設定（proconfig = NULL）
-- ALTER FUNCTION mbti.update_line_pay_orders_updated_at() RESET search_path;
-- ALTER FUNCTION public._staff_auth_recent_failures(text, integer) RESET search_path;
--
-- -- [5] 敏感表：原 relacl = anon、authenticated 皆全部權限（GRANT ALL 在 PG17 含 MAINTAIN）
-- GRANT ALL ON TABLE public.daily_checkins, public.line_pay_orders, public.mbti_claims,
--   public.quest_completions, public.special_eggs TO anon, authenticated;
-- COMMIT;
-- >>> ROLLBACK SQL END
