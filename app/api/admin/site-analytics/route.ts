import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';
import { getGoogleSiteAnalytics } from '@/src/services/google-site-analytics.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_RANGES = new Set(['7d', '28d', '90d']);

export async function GET(req: NextRequest) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedRange = req.nextUrl.searchParams.get('range') || '28d';
    const range = VALID_RANGES.has(requestedRange) ? requestedRange : '28d';
    const analytics = await getGoogleSiteAnalytics(range as '7d' | '28d' | '90d');

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('GET /api/admin/site-analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch site analytics' }, { status: 500 });
  }
}
