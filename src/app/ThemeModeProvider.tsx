import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createAppTheme } from '../theme';
import type { ThemeMode } from '../theme';
import { ThemeModeContext } from './themeModeContext';
import type { ThemeModeContextValue, ThemeModePreference } from './themeModeContext';

// Only this one word is stored, per browser. It is a display preference, not personal data.
const STORAGE_KEY = 'theme-mode';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readPreference(): ThemeModePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    // Storage can be blocked (private window): the choice then lasts until the page is closed.
    return 'system';
  }
}

function subscribeToSystem(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const themes: Record<ThemeMode, ReturnType<typeof createAppTheme>> = {
  light: createAppTheme('light'),
  dark: createAppTheme('dark'),
};

/** Provides the light or dark theme: the saved choice, or the device setting when none was made. */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemeModePreference>(readPreference);
  const systemDark = useSyncExternalStore(
    subscribeToSystem,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const mode: ThemeMode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  const setPreference = useCallback((next: ThemeModePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved; the choice still applies to this page.
    }
  }, []);

  const value = useMemo<ThemeModeContextValue>(() => ({ preference, setPreference, mode }), [preference, setPreference, mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={themes[mode]}>
        {/* `enableColorScheme` makes scrollbars and form controls of the browser follow the mode. */}
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
