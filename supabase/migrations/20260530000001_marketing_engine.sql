-- 幽靈接真 G1：行銷引擎資料層（同意 + 寄送紀錄 + 內容/追蹤欄位）
-- 安全：marketing_consents 預設 consent=false（opt-in）；既有舊顧客無同意 → 不會被群發。

-- 行銷同意（涵蓋訪客 + 會員，以 email 為主鍵）
CREATE TABLE IF NOT EXISTS marketing_consents (
  email             TEXT PRIMARY KEY,
  consent           BOOLEAN NOT NULL DEFAULT false,
  unsubscribe_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  source            TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketing_consents_token ON marketing_consents(unsubscribe_token);

-- 寄送稽核 + idempotency（同一 campaign 對同一 email 只寄一次）
CREATE TABLE IF NOT EXISTS marketing_sends (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID,
  rule_id     UUID,
  email       TEXT NOT NULL,
  channel     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'sent',
  error       TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_campaign ON marketing_sends(campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_sends_campaign_email
  ON marketing_sends(campaign_id, email) WHERE campaign_id IS NOT NULL;

-- campaigns：追蹤 + 內容來源
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_count  INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_at     TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_id UUID;

-- automation rules：內容來源（→ push_templates）
ALTER TABLE marketing_automation_rules ADD COLUMN IF NOT EXISTS template_id UUID;

-- RLS：僅 service_role 可讀寫（app 用 createAdminClient 繞過）；不開公開政策
ALTER TABLE marketing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sends    ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE marketing_consents IS '行銷同意（opt-in 預設否）+ 退訂 token';
COMMENT ON TABLE marketing_sends    IS '行銷寄送稽核與 idempotency';
