const MENU_NAME_ALIASES: Record<string, string> = {
  '原味巴斯克': '北海道經典巴斯克',
  '蜜香紅茶巴斯克': '茶香巴斯克',
  '布丁': '經典烤布丁',
  '北海道十勝低糖原味千層': '經典十勝原味千層',
  '檸檬日本柚子千層': '檸檬柚子千層蛋糕',
  '法芙娜巧克力布朗尼千層': '巧克力布朗尼千層',
  '日本柚子蘋果乳酪米蘇': '柚子蘋果提拉米蘇',
  '小山園抹茶米蘇': '抹茶提拉米蘇',
};

export function getAlignedMenuItemName(name: string): string {
  return MENU_NAME_ALIASES[name] || name;
}
