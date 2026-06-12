#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = 'https://shop.kiwimu.com';
const GA4_ID = 'G-DM6F27KL8B';
const GSC_TOKEN = '2RFBMYJ30DsIGKJ9nRS1286s4lbJNFMOsK7s_QDQhSs';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const profile = args.get('profile') || 'local-build';
const validProfiles = new Set(['local-build', 'production']);

if (!validProfiles.has(profile)) {
  console.error(`Invalid --profile=${profile}. Use local-build or production.`);
  process.exit(2);
}

const results = [];

function record(name, pass, details = '') {
  results.push({ name, pass, details });
  const prefix = pass ? '[PASS]' : '[FAIL]';
  console.log(`${prefix} ${name}${details ? ` - ${details}` : ''}`);
}

function hasCanonical(html) {
  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/shop\.kiwimu\.com\/?["'][^>]*>|<link[^>]+href=["']https:\/\/shop\.kiwimu\.com\/?["'][^>]+rel=["']canonical["'][^>]*>/i.test(html);
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Kiwimu-Shop-Analytics-SEO-Smoke/1.0',
    },
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function readLocalBuildHtml(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Missing local build artifact: ${filePath}. Run npm run build first.`);
  }
}

async function runHtmlChecks(label, html, { checkout = false } = {}) {
  record(`${label} canonical`, checkout || hasCanonical(html), checkout ? 'checkout is noindex' : '');
  record(`${label} GA4 id`, html.includes(GA4_ID), GA4_ID);
  record(`${label} GSC verification`, html.includes(GSC_TOKEN), 'google-site-verification');

  if (checkout) {
    record(`${label} noindex`, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*nofollow[^"']*["'][^>]*>/i.test(html));
  } else {
    record(`${label} indexable robots`, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*index[^"']*follow[^"']*["'][^>]*>/i.test(html));
    record(`${label} JSON-LD bakery`, /application\/ld\+json/i.test(html) && /"@type":"Bakery"/i.test(html));
  }
}

async function runLocalBuild() {
  const cwd = process.cwd();
  const homeHtml = await readLocalBuildHtml(path.join(cwd, '.next/server/app/index.html'));
  const checkoutHtml = await readLocalBuildHtml(path.join(cwd, '.next/server/app/checkout.html'));
  const analyticsSource = await readFile(path.join(cwd, 'lib/shop-analytics.ts'), 'utf8');

  await runHtmlChecks('local home', homeHtml);
  await runHtmlChecks('local checkout', checkoutHtml, { checkout: true });
  record('analytics helper site id', analyticsSource.includes("site_id: SHOP_ANALYTICS_SITE_ID"));
  record('analytics helper attribution', analyticsSource.includes('utm_source') && analyticsSource.includes('landing_url'));
}

async function runProduction() {
  const home = await fetchText(`${SITE_URL}/`);
  const checkout = await fetchText(`${SITE_URL}/checkout`);
  const robots = await fetchText(`${SITE_URL}/robots.txt`);
  const sitemap = await fetchText(`${SITE_URL}/sitemap.xml`);

  record('production home 200', home.status === 200, `${home.status}`);
  record('production checkout 200', checkout.status === 200, `${checkout.status}`);
  record('production robots 200', robots.status === 200, `${robots.status}`);
  record('production sitemap 200', sitemap.status === 200, `${sitemap.status}`);

  await runHtmlChecks('production home', home.text);
  await runHtmlChecks('production checkout', checkout.text, { checkout: true });
  record('production robots blocks query URLs', /Disallow:\s*\/\*\?\*/i.test(robots.text));
  record('production sitemap has home', sitemap.text.includes(`<loc>${SITE_URL}</loc>`) || sitemap.text.includes(`<loc>${SITE_URL}/</loc>`));
}

console.log(`Kiwimu Shop analytics/SEO verification`);
console.log(`Profile: ${profile}`);

try {
  if (profile === 'production') {
    await runProduction();
  } else {
    await runLocalBuild();
  }
} catch (error) {
  record('verification runtime', false, error instanceof Error ? error.message : String(error));
}

const failed = results.filter((result) => !result.pass);
console.log(`\nSummary: ${results.length - failed.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
  process.exit(1);
}
