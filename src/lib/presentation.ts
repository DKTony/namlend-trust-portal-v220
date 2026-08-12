export const LEGACY_PRESENTATION_KEYS = [
  'namlend-theme-variant',
  'namlend-dark-mode',
  'vite-ui-theme',
  'namlend-branding-cache',
] as const;

/** Remove historical preferences and enforce the one supported OG presentation. */
export function enforceOgPresentation(
  storage: Pick<Storage, 'removeItem'> = window.localStorage,
  root: HTMLElement = document.documentElement
): void {
  for (const key of LEGACY_PRESENTATION_KEYS) storage.removeItem(key);
  root.classList.remove('dark');
  root.classList.add('light');
  root.removeAttribute('data-theme');
}
