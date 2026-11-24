import TaskAltIcon from '@mui/icons-material/TaskAlt';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { ThemeModeButton } from './ThemeModeButton';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Small links under the card, e.g. "Back to sign in". */
  footer?: ReactNode;
}

/** The frame of every page that needs no sign-in: a centered card on the grey page background. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box
      component="main"
      sx={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 2, py: 6, bgcolor: 'background.default' }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeModeButton />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box aria-hidden sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'primary.main', color: 'common.white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TaskAltIcon />
        </Box>
        <Typography variant="h2" component="p" sx={{ fontSize: 20, lineHeight: '28px' }}>
          Issue Tracker
        </Typography>
      </Box>
      <Box sx={{ width: '100%', maxWidth: 440, p: 5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h1" component="h1" sx={{ fontSize: 24, lineHeight: '32px', fontWeight: 500 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
        <Box sx={{ mt: 3 }}>{children}</Box>
      </Box>
      {footer && (
        <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 3, textAlign: 'center' }}>
          {footer}
        </Typography>
      )}
    </Box>
  );
}
