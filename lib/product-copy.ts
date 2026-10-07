const CATEGORY_LABELS: Record<string, string> = {
  tiramisu: '提拉米蘇',
  basque: '巴斯克乳酪',
  chiffon: '戚風蛋糕',
  mille_crepe: '千層蛋糕',
  pudding: '布丁與單點',
  drinks: '飲品',
};

/** Display category names without exposing internal IDs or slugs. */
export function productCategoryLabel(category?: string | null, name?: string | null): string {
  if (category && Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category)) return CATEGORY_LABELS[category];
  if (name && /[\u3400-\u9fff]/.test(name)) return name;
  if (category && /[\u3400-\u9fff]/.test(category)) return category;
  return '甜點';
}
