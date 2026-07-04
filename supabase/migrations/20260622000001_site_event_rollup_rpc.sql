-- Five-site analytics rollup for the Shop admin dashboard.
-- Returns aggregated user_events only; metadata payloads and user IDs are not exposed.

CREATE OR REPLACE FUNCTION public.get_site_event_rollup(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
)
RETURNS TABLE (
  site TEXT,
  event_type TEXT,
  total BIGINT,
  tracked_users BIGINT,
  site_tracked_users BIGINT,
  latest_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      ue.site,
      ue.event_type,
      ue.user_id,
      ue.created_at
    FROM public.user_events ue
    WHERE ue.created_at >= p_start
      AND ue.created_at < p_end
  ),
  site_totals AS (
    SELECT
      filtered.site,
      COUNT(DISTINCT filtered.user_id) AS site_tracked_users
    FROM filtered
    WHERE filtered.user_id IS NOT NULL
    GROUP BY filtered.site
  )
  SELECT
    filtered.site,
    filtered.event_type,
    COUNT(*) AS total,
    COUNT(DISTINCT filtered.user_id) AS tracked_users,
    COALESCE(site_totals.site_tracked_users, 0) AS site_tracked_users,
    MAX(filtered.created_at) AS latest_at
  FROM filtered
  LEFT JOIN site_totals ON site_totals.site = filtered.site
  GROUP BY filtered.site, filtered.event_type, site_totals.site_tracked_users
  ORDER BY filtered.site, total DESC, filtered.event_type;
$$;

REVOKE ALL ON FUNCTION public.get_site_event_rollup(TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_event_rollup(TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;
