import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase-admin';

type AnalyticsRange = '7d' | '28d' | '90d';

interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
  project_id?: string;
}

interface SearchConsoleOAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface SiteEventRollupRow {
  site: string | null;
  event_type: string | null;
  total: number | string | null;
  tracked_users: number | string | null;
  site_tracked_users: number | string | null;
  latest_at: string | null;
}

export interface SiteAnalyticsRow {
  key: string;
  label: string;
  hostname: string;
  searchConsoleSiteUrl: string;
  supabaseSite: string;
  ga4: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    eventCount: number;
  };
  searchConsole: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    error?: string;
  };
  supabase: {
    eventCount: number;
    trackedUsers: number;
    latestEventAt: string | null;
    topEvents: Array<{
      eventType: string;
      count: number;
    }>;
    error?: string;
  };
}

export interface SiteAnalyticsResponse {
  range: AnalyticsRange;
  startDate: string;
  endDate: string;
  ga4PropertyId: string;
  credentials: {
    ga4: boolean;
    searchConsole: boolean;
  };
  sites: SiteAnalyticsRow[];
  errors: string[];
}

const DEFAULT_GA4_PROPERTY_ID = '526838967';

const SITE_CONFIGS = [
  {
    key: 'kiwimu-com',
    envKey: 'KIWIMU_COM',
    label: 'Kiwimu / MBTI',
    hostname: 'kiwimu.com',
    supabaseSite: 'kiwimu',
    defaultSearchConsoleSiteUrl: 'sc-domain:kiwimu.com',
  },
  {
    key: 'shop-kiwimu-com',
    envKey: 'SHOP_KIWIMU_COM',
    label: 'Shop',
    hostname: 'shop.kiwimu.com',
    supabaseSite: 'shop',
    defaultSearchConsoleSiteUrl: 'https://shop.kiwimu.com/',
  },
  {
    key: 'passport-kiwimu-com',
    envKey: 'PASSPORT_KIWIMU_COM',
    label: 'Passport',
    hostname: 'passport.kiwimu.com',
    supabaseSite: 'passport',
    defaultSearchConsoleSiteUrl: 'sc-domain:passport.kiwimu.com',
  },
  {
    key: 'gacha-kiwimu-com',
    envKey: 'GACHA_KIWIMU_COM',
    label: 'Gacha',
    hostname: 'gacha.kiwimu.com',
    supabaseSite: 'gacha',
    defaultSearchConsoleSiteUrl: 'sc-domain:gacha.kiwimu.com',
  },
  {
    key: 'map-kiwimu-com',
    envKey: 'MAP_KIWIMU_COM',
    label: 'Map',
    hostname: 'map.kiwimu.com',
    supabaseSite: 'map',
    defaultSearchConsoleSiteUrl: 'sc-domain:map.kiwimu.com',
  },
] as const;

export async function getGoogleSiteAnalytics(range: AnalyticsRange): Promise<SiteAnalyticsResponse> {
  const { startDate, endDate } = getDateRange(range);
  const ga4PropertyId = process.env.GA4_PROPERTY_ID || process.env.GOOGLE_GA4_PROPERTY_ID || DEFAULT_GA4_PROPERTY_ID;
  const sites: SiteAnalyticsRow[] = SITE_CONFIGS.map((site) => ({
    key: site.key,
    label: site.label,
    hostname: site.hostname,
    supabaseSite: site.supabaseSite,
    searchConsoleSiteUrl: getSearchConsoleSiteUrl(site.envKey, site.defaultSearchConsoleSiteUrl),
    ga4: {
      activeUsers: 0,
      sessions: 0,
      screenPageViews: 0,
      eventCount: 0,
    },
    searchConsole: {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    },
    supabase: {
      eventCount: 0,
      trackedUsers: 0,
      latestEventAt: null,
      topEvents: [],
    },
  }));

  const errors: string[] = [];
  const ga4Credentials = readServiceAccountCredentials();
  const searchConsoleConfig = readSearchConsoleOAuthConfig();

  if (!ga4Credentials) {
    errors.push('GA4 service account credentials are not configured.');
  } else {
    try {
      await fillGa4Metrics(sites, ga4PropertyId, startDate, endDate, ga4Credentials);
    } catch (error) {
      errors.push(`GA4 Data API failed: ${toSafeErrorMessage(error)}`);
    }
  }

  if (!searchConsoleConfig) {
    errors.push('Search Console OAuth credentials are not configured.');
  } else {
    await fillSearchConsoleMetrics(sites, startDate, endDate, searchConsoleConfig);
  }

  try {
    await fillSupabaseEventMetrics(sites, startDate, endDate);
  } catch (error) {
    errors.push(`Supabase user_events failed: ${toSafeErrorMessage(error)}`);
    for (const site of sites) {
      site.supabase.error = toSafeErrorMessage(error);
    }
  }

  return {
    range,
    startDate,
    endDate,
    ga4PropertyId,
    credentials: {
      ga4: !!ga4Credentials,
      searchConsole: !!searchConsoleConfig,
    },
    sites,
    errors,
  };
}

async function fillSupabaseEventMetrics(
  sites: SiteAnalyticsRow[],
  startDate: string,
  endDate: string,
) {
  const admin = createAdminClient();
  const start = `${startDate}T00:00:00.000Z`;
  const end = new Date(`${endDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  const { data, error } = await admin
    .rpc('get_site_event_rollup', {
      p_start: start,
      p_end: end.toISOString(),
    });

  if (error) throw error;

  const rollupRows = (data || []) as SiteEventRollupRow[];
  const bySite = new Map<string, SiteEventRollupRow[]>();
  for (const row of rollupRows) {
    const site = String(row.site || '');
    const rows = bySite.get(site) || [];
    rows.push(row);
    bySite.set(site, rows);
  }

  for (const site of sites) {
    const rows = bySite.get(site.supabaseSite) || [];
    const sortedRows = [...rows].sort((a, b) => readMetric(b.total) - readMetric(a.total));

    site.supabase = {
      eventCount: rows.reduce((sum, row) => sum + readMetric(row.total), 0),
      trackedUsers: rows.reduce((sum, row) => Math.max(sum, readMetric(row.site_tracked_users)), 0),
      latestEventAt: rows.reduce<string | null>((latest, row) => {
        const value = typeof row.latest_at === 'string' ? row.latest_at : null;
        if (!value) return latest;
        if (!latest || value > latest) return value;
        return latest;
      }, null),
      topEvents: sortedRows.slice(0, 4).map((row) => ({
        eventType: String(row.event_type || 'unknown'),
        count: readMetric(row.total),
      })),
    };
  }
}

function getDateRange(range: AnalyticsRange) {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 28;
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fillGa4Metrics(
  sites: SiteAnalyticsRow[],
  propertyId: string,
  startDate: string,
  endDate: string,
  credentials: ServiceAccountCredentials,
) {
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key?.replace(/\\n/g, '\n'),
    },
  });

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'hostName' }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'eventCount' },
    ],
  });

  const byHost = new Map<string, SiteAnalyticsRow['ga4']>();

  for (const row of response.rows || []) {
    const hostname = normalizeHostname(row.dimensionValues?.[0]?.value || '');
    byHost.set(hostname, {
      activeUsers: readMetric(row.metricValues?.[0]?.value),
      sessions: readMetric(row.metricValues?.[1]?.value),
      screenPageViews: readMetric(row.metricValues?.[2]?.value),
      eventCount: readMetric(row.metricValues?.[3]?.value),
    });
  }

  for (const site of sites) {
    const metrics = byHost.get(normalizeHostname(site.hostname));
    if (metrics) site.ga4 = metrics;
  }
}

async function fillSearchConsoleMetrics(
  sites: SiteAnalyticsRow[],
  startDate: string,
  endDate: string,
  config: SearchConsoleOAuthConfig,
) {
  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret);
  auth.setCredentials({ refresh_token: config.refreshToken });
  const searchConsole = google.webmasters({ version: 'v3', auth });

  await Promise.all(sites.map(async (site) => {
    try {
      const response = await searchConsole.searchanalytics.query({
        siteUrl: site.searchConsoleSiteUrl,
        requestBody: {
          startDate,
          endDate,
          rowLimit: 1,
        },
      });

      const row = response.data.rows?.[0];
      site.searchConsole = {
        clicks: readMetric(row?.clicks),
        impressions: readMetric(row?.impressions),
        ctr: Number(((row?.ctr || 0) * 100).toFixed(2)),
        position: Number((row?.position || 0).toFixed(1)),
      };
    } catch (error) {
      site.searchConsole.error = toSafeErrorMessage(error);
    }
  }));
}

function readServiceAccountCredentials(): ServiceAccountCredentials | null {
  const rawJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.GA4_SERVICE_ACCOUNT_JSON;

  if (rawJson) return parseJson(rawJson);

  const credentialPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(os.homedir(), '.credentials', 'kiwimu-service-account.json');

  return readJsonFileIfExists(credentialPath);
}

function readSearchConsoleOAuthConfig(): SearchConsoleOAuthConfig | null {
  const tokenPayload = readJsonFileIfExists<{
    refresh_token?: string;
  }>(getSearchConsoleTokenPath());
  const refreshToken = tokenPayload?.refresh_token || process.env.GOOGLE_SC_REFRESH_TOKEN;
  if (!refreshToken) return null;

  const secretJson =
    process.env.GOOGLE_SC_CLIENT_SECRET_JSON ||
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET_JSON;

  const clientSecretPayload = secretJson
    ? parseJson(secretJson)
    : readJsonFileIfExists(
        process.env.GOOGLE_SC_CLIENT_SECRET_FILE ||
        process.env.GOOGLE_STACK_CLIENT_ID_FILE ||
        path.join(os.homedir(), '.credentials', 'kiwimu-oauth-desktop-client.json'),
      ) ||
      readJsonFileIfExists(
        path.join(os.homedir(), '.credentials', 'search-console-client-secret.json'),
      );

  const clientId =
    process.env.GOOGLE_SC_CLIENT_ID ||
    clientSecretPayload?.web?.client_id ||
    clientSecretPayload?.installed?.client_id;

  const clientSecret =
    process.env.GOOGLE_SC_CLIENT_SECRET ||
    clientSecretPayload?.web?.client_secret ||
    clientSecretPayload?.installed?.client_secret;

  if (!clientId || !clientSecret) return null;

  return { clientId, clientSecret, refreshToken };
}

function getSearchConsoleTokenPath() {
  const candidates = [
    process.env.GOOGLE_SC_TOKEN_FILE,
    process.env.GOOGLE_STACK_TOKEN_FILE,
    path.join(os.homedir(), '.config', 'kiwimu', 'google-stack-token.json'),
    path.join(os.homedir(), '.credentials', 'search-console-token.json'),
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function getSearchConsoleSiteUrl(envKey: string, fallback: string) {
  return (
    process.env[`GOOGLE_SC_SITE_${envKey}`] ||
    process.env.GOOGLE_SC_SITE_DOMAIN ||
    fallback
  );
}

function readMetric(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function parseJson<T = any>(raw: string): T | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJsonFileIfExists<T = any>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function toSafeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}
