/** Enable only after marketing table permissions and existing content are reviewed. */
export function isMarketingDispatchEnabled(): boolean {
  return process.env.SHOP_MARKETING_SEND_ENABLED === 'true'
}
