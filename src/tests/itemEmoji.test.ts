import { describe, expect, it } from 'vitest';
import { getDefaultItemEmoji, resolveItemEmoji } from '../utils/itemEmoji';

describe('item emoji', () => {
  it('uses a category default when no emoji was selected', () => {
    expect(resolveItemEmoji(undefined, 'cat-transport')).toBe('🛵');
    expect(resolveItemEmoji('', 'cat-digital')).toBe('📱');
  });

  it('prefers the emoji selected by the user', () => {
    expect(resolveItemEmoji('🚲', 'cat-transport')).toBe('🚲');
  });

  it('falls back safely for unknown categories', () => {
    expect(getDefaultItemEmoji('custom-category')).toBe('📦');
  });

  it('does not render legacy icon keys as visible text', () => {
    expect(resolveItemEmoji('digital', 'cat-digital')).toBe('📱');
  });
});
