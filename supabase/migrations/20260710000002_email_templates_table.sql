-- =============================================================
-- 2026-07-10 email_templates 表補進版控
-- 背景：此表先前手動於 Supabase Dashboard 建立，未進 migration。
--       本檔用 IF NOT EXISTS 補檔：對既有 production 是 no-op，
--       對全新環境則建出 admin email-templates 模組所需的表。
-- 欄位依據：app/api/admin/email-templates/route.ts（select/insert 欄位）
--           與 lib/notifications.ts 的模板查詢。
-- 存取模式：僅 server-side service role（createAdminClient）讀寫，
--           無 anon/authenticated 存取需求 → RLS 啟用、不開任何 policy。
-- =============================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order_confirmation', 'shipping', 'promotional', 'welcome', 'custom')),
  subject TEXT NOT NULL,
  preview_text TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  used_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.email_templates IS 'Admin 訂單/行銷信模板；僅 service role 存取（admin API 與 notifications）';
