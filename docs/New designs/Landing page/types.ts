export type ThemeVariant = 'glass' | 'lux' | 'neo';

export interface ThemeConfig {
  name: string;
  variant: ThemeVariant;
  background: string;
  cardClass: string;
  textClass: string;
  accentClass: string;
  borderClass: string;
  buttonClass: string;
  inputClass: string;
}

export interface ThemeContextType {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  styles: ThemeConfig;
}