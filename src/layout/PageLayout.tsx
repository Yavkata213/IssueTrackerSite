import LastPageIcon from '@mui/icons-material/LastPage';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useShell } from './shellContext';

export interface BreadcrumbItem {
  label: string;
}

interface PageLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

/**
 * Frame shared by every page: a 64 px bar with the breadcrumb on top of a grey content area
 * with 32 px side padding. The content area fills the remaining height; pages decide what scrolls.
 */
export function PageLayout({ breadcrumbs, children }: PageLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useShell();

  return (
    <>
      <Box
        sx={{
          height: 64,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 4,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {sidebarCollapsed && (
          <IconButton aria-label="Expand sidebar" onClick={toggleSidebar} edge="start">
            <LastPageIcon />
          </IconButton>
        )}
        <Breadcrumbs separator="/" aria-label="breadcrumb" sx={{ '& .MuiBreadcrumbs-separator': { mx: 1, color: 'text.secondary' } }}>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Typography
                key={`${item.label}-${index}`}
                variant="body2"
                aria-current={isLast ? 'page' : undefined}
                sx={{
                  color: index === 0 ? 'text.secondary' : 'text.primary',
                  fontWeight: isLast ? 500 : 400,
                }}
              >
                {item.label}
              </Typography>
            );
          })}
        </Breadcrumbs>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          px: 4,
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>
    </>
  );
}
