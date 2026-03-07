# Kiwimu Commerce OS — 世界憲法 v2.0
> **2026-03-07 全面重寫。此為唯一有效版本。**
> 所有 AI 協作者、所有開發人員：先讀完這份，才能寫第一行 code。
> 違反任何一條絕對規則 = 破壞系統，不得合並。

---

## 一、系統身份宣言

Kiwimu Commerce OS **不是一個甜點電商**。
它是一個 **「Identity Driven Experience Commerce Platform」**：
- 人先透過 MBTI 找到自己的靈魂配方（Identity）
- 系統根據身份給出專屬體驗（Experience）
- 體驗引導進入消費（Commerce）
- 消費觸發遊戲化回報（Gamification）
- 回報強化身份認同（循環）

---

## 二、系統 6 大核心層（Layer Boundaries）

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Frontend Experience Layer             │
│  Map / Shop UI / Passport / MBTI / Gacha        │
│  ✅ 只做 UI 渲染   ❌ 絕對禁止直連 DB           │
└────────────────────┬────────────────────────────┘
                     │ fetch('/api/...')（唯一通道）
┌────────────────────▼────────────────────────────┐
│  Layer 2: Identity Layer                        │
│  MBTI Engine / User Profile / Session           │
│  統一 User ID：Supabase Auth (xlqwfaailjyv...)  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Layer 3: Experience Layer                      │
│  Recommendation Engine / Quest Engine           │
│  Story Engine / Seasonal Events                 │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Layer 4: Commerce Core                         │
│  Product / Cart / Order / Payment               │
│  ← 這是整個系統的 Shopify-like 核心引擎         │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Layer 5: Gamification Engine                   │
│  Points / Gacha / Badge / Reward / Quest        │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Layer 6: Event System（跨層唯一通訊管道）       │
│  EventBus — 所有跨模組副作用必須走這裡           │
│  見 EVENTS.md 事件字典                          │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Data Layer: Supabase PostgreSQL                │
│  月島主庫：xlqwfaailjyvsycjnzkz                 │
│  MBTI 內容庫：uvddrlkmdvbuxlyjjpao              │
│  ← 只有 Repository 層可以碰這裡                 │
└─────────────────────────────────────────────────┘
```

---

## 三、3 條絕對開發憲法（CRITICAL RULES）

> ⚠️ 沒有「特殊情況」、「暫時先這樣」、「只有這次」的例外。

---

### 法條 1：No UI-DB Coupling（前端禁止直連資料庫）

**禁止**（無論哪個站點）：
```typescript
// ❌ Map、MBTI、Passport、Gacha 頁面裡
import { supabase } from '@/lib/supabase';
const { data } = await supabase.from('menu_items').select('*');
```

**正確**：
```typescript
// ✅ 所有前端一律透過 API 取資料
const res = await fetch('https://kiwimu.com/api/menu');
const { data } = await res.json();
```

**為什麼**：DB Schema 一旦改欄位名稱，只有 API 要改，5 個前端不崩潰。

---

### 法條 2：3-Tier Layer（職責絕對分離）

每一個新功能必須拆成三層，放在正確的位置：

```
app/api/[module]/route.ts        ← Controller 層
  └─ 只做：接收 Request、權限攔截、呼叫 Service、回傳 Response
  └─ 禁止：寫 SQL、寫商業邏輯

src/services/[module].service.ts  ← Service 層
  └─ 只做：商業邏輯（if/else 判斷、計算、流程控制）
  └─ 禁止：寫 SQL、寫 HTTP 回應格式

src/repositories/[module].repository.ts  ← Repository 層
  └─ 只做：所有 Supabase 查詢（.from().select().insert()...）
  └─ 禁止：寫商業邏輯、寫 HTTP
```

**標準範例**（新功能必須長這樣）：

```typescript
// ① Repository：只管資料
// src/repositories/order.repository.ts
export const createOrder = async (payload: CreateOrderPayload) => {
  const { data, error } = await adminClient
    .from('shop_orders')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

// ② Service：只管邏輯
// src/services/order.service.ts
export const processCheckout = async (cart: CartItem[], userId: string) => {
  const total = calculateTotal(cart);
  if (total <= 0) throw new Error('訂單金額不合法');
  const order = await createOrder({ user_id: userId, total_price: total });
  await EventBus.emit('order.created', {
    order_id: order.id,
    customer_id: userId,
    total_price: total,
  });
  return order;
};

// ③ Route：只管 HTTP
// app/api/order/route.ts
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const order = await processCheckout(body.cart, session.user.id);
  return NextResponse.json({ data: order });
}
```

---

### 法條 3：Event Driven（跨模組禁止硬依賴）

**禁止**（Order 模組直接叫 Reward 模組）：
```typescript
// ❌ 緊耦合，Order 知道太多其他模組的事
const order = await OrderRepo.createOrder(data);
await RewardService.addPoints(order.customer_id, 100);  // 禁止！
await BadgeService.checkUnlock(order.customer_id);       // 禁止！
```

**正確**（Order 只管自己，副作用交給 EventBus）：
```typescript
// ✅ 解耦
const order = await OrderRepo.createOrder(data);
await EventBus.emit('order.created', {
  order_id: order.id,
  customer_id: order.customer_id,
  total_price: order.total_price,
});
// Reward 模組自己監聽 order.created 事件加點數
// Badge 模組自己監聽 points.earned 事件解鎖勳章
```

**EventBus 實裝位置**：`src/lib/event-bus.ts`（見下方）

---

## 四、站點職責邊界（各站能做什麼）

| 站點 | 網域 | 允許 | 禁止 |
|------|------|------|------|
| **Dessert-Booking** | shop.kiwimu.com / kiwimu.com | 所有 API 路由、DB 操作、Commerce 邏輯 | - |
| **MBTI Lab** | mbti.kiwimu.com | 測驗流程 UI、呼叫 kiwimu.com API | 直連 DB、寫 RLS |
| **Passport** | passport.kiwimu.com | 積分/集章 UI、呼叫 kiwimu.com API | 直連 DB |
| **Moon Map** | map.kiwimu.com | 地圖 UI、呼叫 kiwimu.com/api/menu | 直連 DB、本地 JSON 菜單 |
| **Gacha** | gacha.kiwimu.com | 扭蛋 UI、呼叫 kiwimu.com API | 直連 DB、自己計算積分 |
| **kiwimu-landing** | kiwimu.com/* | A/B test 落地頁 | 任何 API 邏輯 |

---

## 五、EventBus 實裝規格

**位置**：`src/lib/event-bus.ts`

```typescript
// src/lib/event-bus.ts
type EventPayload = Record<string, unknown>;
type EventHandler = (payload: EventPayload) => Promise<void>;

const handlers: Map<string, EventHandler[]> = new Map();

export const EventBus = {
  // 訂閱事件（在 module 初始化時呼叫）
  on(event: string, handler: EventHandler) {
    if (!handlers.has(event)) handlers.set(event, []);
    handlers.get(event)!.push(handler);
  },

  // 派發事件
  async emit(event: string, payload: EventPayload) {
    const eventHandlers = handlers.get(event) ?? [];
    await Promise.allSettled(eventHandlers.map((h) => h(payload)));
  },
};

// 在 app 啟動時集中初始化所有監聽
// src/lib/event-registry.ts
import { EventBus } from './event-bus';
import { handleOrderCreated } from '@/modules/gamification/reward.handler';
import { handlePointsEarned } from '@/modules/gamification/badge.handler';

EventBus.on('order.created', handleOrderCreated);
EventBus.on('points.earned', handlePointsEarned);
```

---

## 六、目錄結構守則

```
Dessert-Booking/
├── app/                          ← Next.js App Router
│   ├── api/                      ← Controller 層（只做 HTTP）
│   │   ├── order/route.ts
│   │   ├── menu/route.ts
│   │   └── ...
│   └── (pages)
│
├── src/                          ← 業務核心（不依賴 Next.js）
│   ├── repositories/             ← 所有 DB 查詢在這裡
│   │   ├── order.repository.ts
│   │   ├── product.repository.ts
│   │   └── customer.repository.ts
│   ├── services/                 ← 所有商業邏輯在這裡
│   │   ├── order.service.ts
│   │   ├── reward.service.ts
│   │   └── gacha.service.ts
│   ├── modules/                  ← 事件監聽者 (handlers)
│   │   ├── gamification/
│   │   └── marketing/
│   └── lib/
│       ├── event-bus.ts          ← EventBus 實例
│       ├── event-registry.ts     ← 集中初始化所有事件監聽
│       └── supabase/
│           ├── client.ts         ← createBrowserClient（前端用）
│           └── admin.ts          ← createAdminClient（Server 用）
│
└── ARCHITECTURE.md               ← 本文件（世界憲法）
└── EVENTS.md                     ← 事件字典
```

---

## 七、Supabase 使用守則

```typescript
// ✅ Server-side（API Routes、Server Actions）
import { createAdminClient } from '@/src/lib/supabase/admin';
const supabase = createAdminClient(); // 使用 service_role key

// ✅ Client-side（只讀公開資料）
import { createBrowserClient } from '@supabase/ssr';
const supabase = createBrowserClient(url, anonKey);

// ❌ 禁止在 API Route 裡用 anon client 做需要 RLS 的寫入
// ❌ 禁止在前端元件裡直接 import admin client
```

---

## 八、技術棧（永遠不換）

| 層 | 技術 | 備註 |
|----|------|------|
| 前端框架 | React / Next.js 14 App Router | Shop 用 Next.js，其他用 Vite |
| 資料庫 | Supabase PostgreSQL | 永遠不換，不引入其他 DB |
| 部署 | Vercel | 所有站點 |
| 自動化 | n8n | 工作流，不引入其他 |
| 圖片 | Cloudinary | 不用 S3 |
| 社群 | ManyChat + LINE | OMO 核心 |
| 付款 | Stripe + LINE Pay | 全球 + 台灣 |

---

## 九、PR / Commit 守則

- Commit 前先跑 `npx tsc --noEmit`，TypeScript 錯誤不合並
- 新增 API 必須對應到正確的 3-Tier 結構
- 每個新事件必須先加進 `EVENTS.md` 才能 emit
- 禁止 `any` 型別
- 禁止 `.env` 進版控

---

**此憲法自 2026-03-07 起全面生效。**
**上一版（v1.0）已作廢。**
