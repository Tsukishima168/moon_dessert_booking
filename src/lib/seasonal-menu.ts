const STRAWBERRY_KEYWORD = '草莓'

export function isSeasonallyDisabledMenuItemName(name: string | null | undefined): boolean {
  return typeof name === 'string' && name.includes(STRAWBERRY_KEYWORD)
}
