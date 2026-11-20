import Box from '@mui/material/Box';
import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ShellContext } from './shellContext';
import type { ShellContextValue } from './shellContext';

/** Sidebar on the left (280 px), the routed page on the right. */
export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const value = useMemo<ShellContextValue>(
    () => ({ sidebarCollapsed, toggleSidebar: () => setSidebarCollapsed((prev) => !prev) }),
    [sidebarCollapsed],
  );

  return (
    <ShellContext.Provider value={value}>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {!sidebarCollapsed && <Sidebar />}
        <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </Box>
    </ShellContext.Provider>
  );
}
