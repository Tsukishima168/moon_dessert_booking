-- audit_logs：Shop Admin 操作稽核紀錄（discord webhook 更新、discord 測試等）
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action, created_at DESC);

-- mbti_recommendations：MBTI 類型對應推薦菜單商品
CREATE TABLE IF NOT EXISTS mbti_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mbti_type TEXT NOT NULL,
  menu_item_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mbti_recommendations_type_idx
  ON mbti_recommendations (mbti_type, priority DESC);
