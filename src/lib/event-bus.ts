/**
 * Kiwimu Commerce OS — EventBus
 *
 * 跨模組唯一通訊管道。
 * 任何跨模組副作用（加點、解鎖勳章、更新分析）必須透過此 EventBus。
 * 禁止任何 Service 直接呼叫另一個 Service。
 *
 * @see EVENTS.md — 事件字典（所有合法事件在此登記）
 * @see src/lib/event-registry.ts — 所有監聽器集中初始化
 */

type EventPayload = Record<string, unknown>;
type EventHandler = (payload: EventPayload) => Promise<void>;

const handlers: Map<string, EventHandler[]> = new Map();

export const EventBus = {
  /**
   * 訂閱事件。在 event-registry.ts 的集中初始化函數中呼叫。
   * @param event - 事件名稱（必須已在 EVENTS.md 登記）
   * @param handler - 處理函數（必須冪等）
   */
  on(event: string, handler: EventHandler): void {
    if (!handlers.has(event)) {
      handlers.set(event, []);
    }
    handlers.get(event)!.push(handler);
  },

  /**
   * 派發事件。所有 handler 並行執行，單一 handler 失敗不影響其他。
   * @param event - 事件名稱（必須已在 EVENTS.md 登記）
   * @param payload - 事件資料（必填欄位見 EVENTS.md）
   */
  async emit(event: string, payload: EventPayload): Promise<void> {
    const eventHandlers = handlers.get(event) ?? [];

    if (eventHandlers.length === 0) {
      console.warn(`[EventBus] No handlers registered for event: ${event}`);
    }

    const results = await Promise.allSettled(
      eventHandlers.map((h) => h(payload))
    );

    // 記錄失敗的 handler，但不中斷流程
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[EventBus] Handler #${index} failed for event "${event}":`,
          result.reason
        );
      }
    });
  },

  /**
   * 清除所有監聽器（僅用於測試環境）
   */
  _clearAllHandlers(): void {
    handlers.clear();
  },

  /**
   * 取得已註冊的事件列表（僅用於 debug）
   */
  _getRegisteredEvents(): string[] {
    return Array.from(handlers.keys());
  },
};
