import { NextRequest } from 'next/server';
import { PATCH as patchOrderRoute } from '../route';

// 相容舊路徑：統一轉回 /api/admin/orders/[orderId]
export async function PATCH(
  request: NextRequest,
  context: { params: { orderId: string } }
) {
  return patchOrderRoute(request, context);
}
