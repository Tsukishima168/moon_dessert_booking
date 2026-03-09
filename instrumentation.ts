export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerAllEventHandlers } = await import('@/src/lib/event-registry');
    registerAllEventHandlers();
  }
}
