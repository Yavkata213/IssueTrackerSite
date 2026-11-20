import { createContext, useContext } from 'react';

export interface ShellContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const value = useContext(ShellContext);
  if (!value) throw new Error('useShell must be used inside <AppShell>');
  return value;
}
