# Test Coverage Analysis — Moon Dessert Booking System

**Date:** 2026-03-15
**Status:** Zero automated tests exist in the codebase

## Current State

The project has **no test files, no test framework configured, and no coverage tooling**. There is no `jest.config`, `vitest.config`, no test scripts in `package.json`, and no CI pipeline to enforce testing. This is a significant risk for a production e-commerce system handling orders and payments.

---

## Recommended Test Framework Setup

Given the Next.js 14 + TypeScript stack, **Vitest** is recommended over Jest for:
- Native ESM/TypeScript support (no transform config needed)
- Faster execution
- Compatible API (Jest-like `describe`/`it`/`expect`)

Additionally:
- **React Testing Library** for component tests
- **MSW (Mock Service Worker)** for API mocking in integration tests

---

## Priority Areas for Test Coverage

### Priority 1 — Critical Business Logic (Unit Tests)

These modules contain pure or near-pure business logic and are the highest-value, lowest-effort targets for testing.

#### 1.1 `store/cartStore.ts` — Shopping Cart State
| What to test | Why |
|---|---|
| `addItem` — adds new item with quantity 1 | Core purchase flow |
| `addItem` — increments quantity for existing item | Prevents duplicate entries |
| `removeItem` — removes correct item by ID | Cart editing |
| `updateQuantity` — updates quantity; removes item when ≤ 0 | Edge case: zero/negative |
| `getTotalPrice` — sums price × quantity correctly | Financial accuracy |
| `getTotalItems` — returns correct item count | UI display |
| `getFinalPrice` — applies discount, never returns negative | Promo code correctness |
| `normalizePrices` — converts string prices to numbers | Legacy data migration |
| `clearCart` — resets items, promo code, and discount | Checkout completion |
| `setPromoCode` / `clearPromoCode` — manages discount state | Promo code lifecycle |

**Estimated effort:** Low — pure state logic, no external dependencies.

#### 1.2 `src/services/order.service.ts` — Order Creation
| What to test | Why |
|---|---|
| Phone validation rejects invalid formats | Data integrity |
| Phone validation accepts valid 8-12 digit numbers | Correct validation |
| Price normalization: `final_price` vs `total_price` fallback | Financial correctness |
| `discount_amount` defaults to 0 when absent | Promo code edge case |
| `delivery_fee` parsing from string/number/absent | Delivery pricing |
| Order ID format (`ORD` + timestamp) | System consistency |
| Default values (`status: 'pending'`, `delivery_method: 'pickup'`) | Contract enforcement |
| `user_id` falls back to `authUserId` when not provided | Auth integration |
| EventBus.emit is called with correct payload after insert | Event-driven side effects |
| EventBus.emit failure does not reject the order | Fault tolerance |

**Estimated effort:** Medium — requires mocking `insertOrder` and `EventBus`.

#### 1.3 `src/services/promo-code.service.ts` — Promo Code Management
| What to test | Why |
|---|---|
| `createPromoCode` converts code to uppercase | Case normalization |
| `createPromoCode` sets correct defaults (active, min_order=0) | Default behavior |
| Duplicate code error (Postgres 23505) maps to user-friendly error | Error handling |
| `editPromoCode` uppercases code on update | Consistency |
| `editPromoCode` re-throws non-duplicate errors | Error transparency |

**Estimated effort:** Low — simple logic with one external dependency to mock.

#### 1.4 `src/lib/event-bus.ts` — EventBus
| What to test | Why |
|---|---|
| `on` registers handler; `emit` calls it with correct payload | Core mechanism |
| Multiple handlers for same event all execute | Fan-out behavior |
| One failing handler does not block others (`Promise.allSettled`) | Fault isolation |
| `emit` with no registered handlers logs warning | Observability |
| `_clearAllHandlers` resets state (already designed for tests) | Test isolation |

**Estimated effort:** Very low — zero external dependencies, already has test-support methods.

---

### Priority 2 — API Route Validation (Integration Tests)

#### 2.1 `app/api/order/route.ts` — Order API
| What to test | Why |
|---|---|
| Returns 400 when `customer_name` is missing | Input validation |
| Returns 400 when `items` is empty array | Empty cart guard |
| Returns 400 when `items` is not an array | Type guard |
| Returns 200 with `order_id` on valid input | Happy path |
| Returns 500 with error message on service failure | Error propagation |

#### 2.2 `app/api/promo-code/validate/route.ts` — Promo Code Validation
| What to test | Why |
|---|---|
| Returns 400 when `code` or `orderAmount` is missing | Input guard |
| Code is uppercased and trimmed before validation | Normalization |
| Returns validation result on valid request | Happy path |

#### 2.3 `app/api/admin/_utils/ensureAdmin.ts` — Admin Auth Guard
| What to test | Why |
|---|---|
| Rejects non-admin emails | Security |
| Accepts valid admin credentials | Access control |
| Handles missing/malformed auth headers | Edge cases |

#### 2.4 `app/api/admin/_utils/adminAuthLimiter.ts` — Rate Limiting
| What to test | Why |
|---|---|
| Allows requests under rate limit | Normal operation |
| Blocks requests over rate limit | Brute force protection |

**Estimated effort:** Medium — requires Next.js request/response mocking.

---

### Priority 3 — Order Status State Machine (Unit + Integration)

#### 3.1 `src/services/order-status-transition.service.ts`
| What to test | Why |
|---|---|
| Returns no-change notification result when status unchanged | Skip unnecessary notifications |
| Throws `OrderNotFoundError` for non-existent order | Error handling |
| Calls `runOrderStatusSideEffects` only when status actually changes | Notification accuracy |
| Passes correct previous/current status to side effects | State transition integrity |

#### 3.2 `src/services/order-status-side-effects.service.ts`
| What to test | Why |
|---|---|
| Sends to all channels when `requestedChannel` is `'all'` | Default behavior |
| Sends to single channel when specific channel requested | Manual retry |
| Skips n8n when webhook URL not configured | Graceful degradation |
| Logs notification result to `notification_logs` | Audit trail |
| Still returns result when log insertion fails | Fault tolerance |

**Estimated effort:** Medium-high — requires mocking notification services and repository.

---

### Priority 4 — React Component Tests

#### 4.1 `components/CartSidebar.tsx`
- Renders cart items with correct names, prices, quantities
- Quantity +/- buttons update state
- Remove button removes item
- Displays correct total and final price
- Shows promo code discount when applied

#### 4.2 `components/ProductCard.tsx`
- Renders product name, price, image
- "Add to cart" button triggers `addItem`
- Handles missing image gracefully

#### 4.3 `components/Navbar.tsx`
- Displays cart item count badge
- Cart icon click opens cart sidebar

**Estimated effort:** Medium — requires React Testing Library + store mocking.

---

### Priority 5 — Middleware & Auth

#### 5.1 `middleware.ts`
| What to test | Why |
|---|---|
| Skips RSC navigation requests (`rsc: '1'` header) | Prevents RSC errors |
| Refreshes Supabase session on normal requests | Session management |
| Route matcher excludes static assets | Performance |

**Estimated effort:** High — requires mocking Supabase SSR client.

---

## Summary: Implementation Roadmap

| Phase | Scope | Files to test | Estimated test count |
|---|---|---|---|
| **Phase 1** | Cart store + EventBus | 2 files | ~25 tests |
| **Phase 2** | Order + Promo Code services | 3 files | ~20 tests |
| **Phase 3** | API route validation | 4-5 routes | ~20 tests |
| **Phase 4** | Order status machine + side effects | 2 files | ~15 tests |
| **Phase 5** | React components | 3-4 components | ~15 tests |
| **Phase 6** | Middleware + Auth | 2-3 files | ~10 tests |

**Total:** ~105 tests across 6 phases

## Quick Start: Setting Up the Test Framework

```bash
# Install Vitest + React Testing Library
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom

# Add test script to package.json
# "test": "vitest",
# "test:coverage": "vitest --coverage"
```

Minimal `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```
