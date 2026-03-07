# Kiwimu Commerce OS — 事件字典 v2.0

> **2026-03-07 全面重寫。**
> 所有跨模組副作用的唯一溝通管道。
> 任何新事件上線前必須先在此登記，才能 emit。
>
> EventBus 實裝位置：`src/lib/event-bus.ts`
> 監聽器集中初始化：`src/lib/event-registry.ts`

---

## 使用規則

1. **emit 前先查字典** — 確認事件已登記，payload 欄位符合規格
2. **新事件先登記** — PR 必須同時包含字典更新 + 監聽器實作
3. **不跨層直接呼叫** — 沒有任何理由繞過 EventBus
4. **handlers 必須冪等** — 同一事件重複觸發不應造成副作用重複

---

## Commerce Core Events（訂單層）

| 事件名稱 | 觸發時機 | 觸發方 | Payload 必填欄位 | 監聽方 |
|---------|---------|--------|----------------|--------|
| `order.created` | 結帳成功，訂單寫入 DB | Order Service | `order_id`, `customer_id`, `total_price`, `items[]` | Gamification（加點數）、Analytics（業績計算）、Notification（發確認信）|
| `order.paid` | 付款狀態更新為 paid | Payment Service | `order_id`, `customer_id`, `payment_method`, `amount` | Marketing（發優惠碼）、Quest（解鎖任務） |
| `order.cancelled` | 訂單被取消 | Order Service | `order_id`, `customer_id`, `reason`, `refund_amount` | Gamification（收回點數）、Analytics |
| `order.completed` | 訂單完成（實體取貨核銷） | Admin Action | `order_id`, `customer_id`, `completed_at` | Passport（到店印章）、Quest |

---

## Gamification Events（遊戲化層）

| 事件名稱 | 觸發時機 | 觸發方 | Payload 必填欄位 | 監聽方 |
|---------|---------|--------|----------------|--------|
| `points.earned` | 獲得積分（消費、簽到、任務） | Reward Service | `customer_id`, `points_amount`, `source`, `metadata?` | Badge Service（觸發解鎖檢查） |
| `points.spent` | 消耗積分（Gacha 或兌換） | Gacha/Reward Service | `customer_id`, `points_amount`, `purpose` | Analytics |
| `badge.unlocked` | 解鎖成就徽章 | Badge Service | `customer_id`, `badge_id`, `badge_name`, `unlocked_at` | Marketing（發放實體獎勵）、Notification |
| `quest.completed` | 跨平台任務完成 | Quest Engine | `customer_id`, `quest_id`, `quest_type`, `completed_at` | Gamification（發放積分獎勵） |
| `gacha.drawn` | 完成一次扭蛋 | Gacha Service | `customer_id`, `result_tier`, `result_item_id`, `drawn_at` | Badge Service（觸發特定徽章解鎖） |
| `checkin.completed` | 每日簽到完成 | Checkin Service | `customer_id`, `checkin_date`, `streak_days` | Gamification（依連簽天數給積分） |

---

## Identity Events（身份層）

| 事件名稱 | 觸發時機 | 觸發方 | Payload 必填欄位 | 監聽方 |
|---------|---------|--------|----------------|--------|
| `mbti.evaluated` | 用戶完成 MBTI 測驗並認領結果 | MBTI Engine | `customer_id`, `mbti_type`, `variant` (`A`/`T`), `evaluated_at` | Experience（客製化推薦）、Quest（完成 MBTI 任務）、Marketing |
| `profile.created` | 新用戶首次建立 Profile | Identity Layer | `customer_id`, `source` (`google`/`line`/`anonymous`) | Marketing（歡迎流程）、Quest（新手任務初始化） |
| `profile.updated` | 用戶更新個人資料 | Profile Service | `customer_id`, `updated_fields[]` | 相關快取清除 |

---

## Experience Events（體驗層）

| 事件名稱 | 觸發時機 | 觸發方 | Payload 必填欄位 | 監聽方 |
|---------|---------|--------|----------------|--------|
| `recommendation.viewed` | 用戶查看 MBTI 推薦甜點 | Experience API | `customer_id`, `mbti_type`, `recommended_items[]` | Analytics |
| `stamp.collected` | 到店核銷集章 | Shop Admin / OMO | `customer_id`, `stamp_type`, `location`, `collected_at` | Passport（更新集章卡）、Quest |

---

## 正確實裝範例

### Emit（派發事件）

```typescript
// src/services/order.service.ts
import { EventBus } from '@/src/lib/event-bus';

export const processCheckout = async (cart: CartItem[], userId: string) => {
  const order = await OrderRepo.createOrder({ user_id: userId, ...cart });

  // 派發事件，不直接呼叫 RewardService
  await EventBus.emit('order.created', {
    order_id: order.id,
    customer_id: userId,
    total_price: order.total_price,
    items: cart,
  });

  return order;
};
```

### Subscribe（訂閱事件）

```typescript
// src/modules/gamification/reward.handler.ts
import { OrderRepo } from '@/src/repositories/order.repository';
import { RewardService } from '@/src/services/reward.service';

export const handleOrderCreated = async (payload: Record<string, unknown>) => {
  const { customer_id, total_price } = payload as {
    customer_id: string;
    total_price: number;
  };

  // 依訂單金額計算點數（每 100 元 = 1 點）
  const points = Math.floor((total_price as number) / 100);
  await RewardService.addPoints(customer_id, points, 'order_purchase');
};
```

### 集中初始化（app 啟動時執行）

```typescript
// src/lib/event-registry.ts
import { EventBus } from './event-bus';
import { handleOrderCreated } from '@/src/modules/gamification/reward.handler';
import { handleOrderCreated as handleOrderBadge } from '@/src/modules/gamification/badge.handler';
import { handlePointsEarned } from '@/src/modules/gamification/badge.handler';
import { handleMbtiEvaluated } from '@/src/modules/experience/recommendation.handler';
import { handleQuestCompleted } from '@/src/modules/gamification/quest.handler';

// 一個函數集中掌管所有訂閱，在 app/layout.tsx 初始化時呼叫一次
export function registerAllEventHandlers() {
  EventBus.on('order.created', handleOrderCreated);
  EventBus.on('order.created', handleOrderBadge);
  EventBus.on('points.earned', handlePointsEarned);
  EventBus.on('mbti.evaluated', handleMbtiEvaluated);
  EventBus.on('quest.completed', handleQuestCompleted);
}
```

---

**此事件字典自 2026-03-07 起全面生效。**
**上線前未登記的事件一律不得 emit。**
