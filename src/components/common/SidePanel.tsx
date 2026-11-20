import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { thinScrollbar } from '../../theme';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  /** Panel width in pixels: 480 for a members list, 1120 for the issue panel. */
  width: number;
  /** Names the panel for screen readers when the header has no visible title. */
  label: string;
  /** Called after the closing animation, e.g. to forget what the panel showed. */
  onExited?: () => void;
  children: ReactNode;
}

/**
 * A panel that slides in from the right over a dimmed page. Escape, the backdrop and the close
 * button call `onClose`; focus stays inside while it is open. It only provides the frame: the
 * content builds its own header (`SidePanelHeader` for the simple case) and scrolls itself.
 */
export function SidePanel({ open, onClose, width, label, onExited, children }: SidePanelProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      aria-label={label}
      slotProps={{
        paper: { sx: { width, maxWidth: '100vw', display: 'flex', flexDirection: 'column', borderRadius: 0 } },
        transition: { onExited },
      }}
    >
      {children}
    </Drawer>
  );
}

interface SidePanelHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

/** Title, subtitle and close button of a simple panel, above a divider. */
export function SidePanelHeader({ title, subtitle, onClose }: SidePanelHeaderProps) {
  const titleId = useId();
  return (
    <Box sx={{ minHeight: 97, flexShrink: 0, px: 4, pt: '27px', pb: '16px', display: 'flex', alignItems: 'flex-start', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography id={titleId} variant="h2" component="h2" noWrap sx={{ fontSize: 20, lineHeight: '28px' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {subtitle}
          </Typography>
        )}
      </Box>
      <IconButton aria-label="Close panel" onClick={onClose} edge="end" sx={{ mt: '-2px', mr: '-16px' }}>
        <CloseIcon />
      </IconButton>
    </Box>
  );
}

/** Scrolling area under a panel header. */
export function SidePanelBody({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: padded ? 4 : 0, ...thinScrollbar }}>{children}</Box>
  );
}
