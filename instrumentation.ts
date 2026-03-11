export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerAllEventHandlers } = await import('@/src/lib/event-registry');
    registerAllEventHandlers();
    console.log('[instrumentation] EventBus handlers registered');
  }
}
