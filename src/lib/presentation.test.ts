import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enforceOgPresentation, LEGACY_PRESENTATION_KEYS } from './presentation';

describe('immutable OG presentation bootstrap', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('discards every retired preference and always restores the light OG root', () => {
    const preferences = new Map<string, string>(
      LEGACY_PRESENTATION_KEYS.map((key) => [key, 'dark-lux'])
    );
    const storage = {
      removeItem: vi.fn((key: string) => preferences.delete(key)),
    };
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'glass');

    enforceOgPresentation(storage, document.documentElement);

    for (const key of LEGACY_PRESENTATION_KEYS) expect(preferences.has(key)).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledTimes(LEGACY_PRESENTATION_KEYS.length);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
