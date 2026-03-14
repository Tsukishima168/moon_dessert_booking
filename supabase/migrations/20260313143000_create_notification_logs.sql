CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'order.status_updated',
  trigger_mode TEXT NOT NULL,
  requested_channel TEXT NOT NULL DEFAULT 'all',
  previous_status TEXT,
  current_status TEXT NOT NULL,
  email_state TEXT NOT NULL,
  email_message TEXT NOT NULL,
  discord_state TEXT NOT NULL,
  discord_message TEXT NOT NULL,
  n8n_state TEXT NOT NULL,
  n8n_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_logs_order_id_idx
  ON notification_logs (order_id, created_at DESC);
