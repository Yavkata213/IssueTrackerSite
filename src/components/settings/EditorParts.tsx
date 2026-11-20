import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Right column of the settings tabs: a card that fills the height next to the list. */
export function EditorCard({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

interface EditorHeaderProps {
  /** Round marker: role shield or category colour. */
  leading: ReactNode;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  /** Height of the header; the role editor is 76 px, the category editor 92 px. */
  height?: number;
}

/** Top of an editor card: marker, title, subtitle and the action buttons on the right. */
export function EditorHeader({ leading, title, subtitle, actions, height = 76 }: EditorHeaderProps) {
  return (
    <Box
      sx={{
        minHeight: height,
        flexShrink: 0,
        px: 3,
        pt: 1.5,
        pb: height > 80 ? '22px' : 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {leading}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h2" noWrap sx={{ fontSize: 20, lineHeight: '28px' }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {subtitle}
        </Typography>
      </Box>
      {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>{actions}</Box>}
    </Box>
  );
}

/** Small label above a field (the settings forms use these instead of the floating label). */
export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <Typography variant="caption" component="label" htmlFor={htmlFor} color="text.secondary" sx={{ display: 'block', mb: '6px' }}>
      {children}
    </Typography>
  );
}
