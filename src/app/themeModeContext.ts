import { createContext, useContext } from 'react';
import type { ThemeMode } from '../theme';

/** What the person chose. `system` follows the device. */
export type ThemeModePreference = 'light' | 'dark' | 'system';

export interface ThemeModeContextValue {
  preference: ThemeModePreference;
  setPreference: (preference: ThemeModePreference) => void;
  /** The mode in use right now (`system` resolved). */
  mode: ThemeMode;
}

export const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function useThemeMode(): ThemeModeContextValue {
  const value = useContext(ThemeModeContext);
  if (!value) throw new Error('useThemeMode must be used inside <ThemeModeProvider>');
  return value;
}
