export const ITEM_EMOJIS = [
  '📦', '📱', '💻', '🎧', '⌚', '📷',
  '🛵', '🚗', '🚲', '🏠', '🛋️', '🧹',
  '👕', '👜', '👟', '🏋️', '💊', '🍽️',
  '📞', '💡', '🛜', '🔧', '✈️', '🎁',
] as const;

const ITEM_EMOJI_SET = new Set<string>(ITEM_EMOJIS);

const CATEGORY_DEFAULT_EMOJI: Record<string, string> = {
  'cat-digital': '📱',
  'cat-home': '🏠',
  'cat-transport': '🛵',
  'cat-sport': '🏋️',
  'cat-fashion': '👕',
  'cat-subscription': '📞',
  'cat-other': '📦',
};

export function getDefaultItemEmoji(categoryId: string): string {
  return CATEGORY_DEFAULT_EMOJI[categoryId] ?? '📦';
}

export function isItemEmoji(value: string | undefined): boolean {
  return Boolean(value && ITEM_EMOJI_SET.has(value.trim()));
}

export function resolveItemEmoji(iconKey: string | undefined, categoryId: string): string {
  return isItemEmoji(iconKey) ? iconKey!.trim() : getDefaultItemEmoji(categoryId);
}
