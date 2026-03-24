-- Admin auth rate limiting & session management
-- Replaces in-memory Map (not shareable across Vercel Lambda instances)

-- Rate limit table: tracks failed attempts per IP across all serverless instances
CREATE TABLE IF NOT EXISTS admin_auth_attempts (
    id          BIGSERIAL PRIMARY KEY,
    client_id   TEXT        NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_auth_attempts_client_id_time
    ON admin_auth_attempts (client_id, attempted_at DESC);

-- Session table: stores random tokens instead of static sha256(password)
CREATE TABLE IF NOT EXISTS admin_sessions (
    token       TEXT        PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
    ON admin_sessions (expires_at);

-- Auto-cleanup expired sessions (runs on SELECT, harmless)
-- Actual cleanup is done by the application on login

-- RLS: these tables are server-only (service role only)
ALTER TABLE admin_auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions       ENABLE ROW LEVEL SECURITY;

-- No public access; only service_role (used by server API routes) can read/write
CREATE POLICY "service role only" ON admin_auth_attempts
    USING (false) WITH CHECK (false);

CREATE POLICY "service role only" ON admin_sessions
    USING (false) WITH CHECK (false);
