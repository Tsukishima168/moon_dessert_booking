/**
 * Kiwimu Commerce OS — Event Registry
 *
 * 所有 EventBus 監聽器的集中初始化點。
 * 在 app/layout.tsx（Server Component）或 instrumentation.ts 啟動時呼叫一次。
 *
 * 新增監聽器規則：
 * 1. 事件必須已在 EVENTS.md 登記
 * 2. handler 必須在對應的 module handler 檔案中定義
 * 3. handler 必須冪等（重複觸發不造成重複副作用）
 *
 * @see EVENTS.md — 事件字典
 * @see src/lib/event-bus.ts — EventBus 實例
 */

import { EventBus } from './event-bus';

// ─── Commerce Core Handlers ─────────────────────────────────────────────────
import { handleOrderCreated } from '@/src/handlers/reward.handler';
// import { handleOrderCreated as handleOrderBadge } from '@/src/modules/gamification/badge.handler';
// import { handleOrderPaid } from '@/src/modules/marketing/promo.handler';
// import { handleOrderCompleted } from '@/src/modules/passport/stamp.handler';

// ─── Gamification Handlers ───────────────────────────────────────────────────
// TODO: 實裝後取消註解
// import { handlePointsEarned } from '@/src/modules/gamification/badge.handler';
// import { handleQuestCompleted } from '@/src/modules/gamification/quest.handler';

// ─── Identity Handlers ───────────────────────────────────────────────────────
// TODO: 實裝後取消註解
// import { handleMbtiEvaluated } from '@/src/modules/experience/recommendation.handler';
// import { handleProfileCreated } from '@/src/modules/marketing/welcome.handler';

let isRegistered = false;

/**
 * 集中初始化所有事件監聽器。
 * 保護機制：只執行一次，重複呼叫無副作用。
 */
export function registerAllEventHandlers(): void {
  if (isRegistered) return;
  isRegistered = true;

  // ─── Commerce Core ──────────────────────────────────────────────
  EventBus.on('order.created', handleOrderCreated);   // → 加積分
  // EventBus.on('order.created', handleOrderBadge);     // → 觸發勳章解鎖檢查
  // EventBus.on('order.paid', handleOrderPaid);         // → 發優惠碼
  // EventBus.on('order.completed', handleOrderCompleted); // → 到店集章

  // ─── Gamification ───────────────────────────────────────────────
  // EventBus.on('points.earned', handlePointsEarned);   // → 觸發勳章解鎖檢查
  // EventBus.on('quest.completed', handleQuestCompleted); // → 發放積分獎勵

  // ─── Identity ───────────────────────────────────────────────────
  // EventBus.on('mbti.evaluated', handleMbtiEvaluated); // → 更新推薦快取
  // EventBus.on('profile.created', handleProfileCreated); // → 歡迎流程

  console.info(
    '[EventRegistry] All event handlers registered.',
    'Active events:',
    EventBus._getRegisteredEvents()
  );
}
