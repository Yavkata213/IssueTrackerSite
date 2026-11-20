import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { CountBadge, StatusDot } from '../../../components/common';
import { thinScrollbar } from '../../../theme';
import type { Status } from '../../../types';
import { StatusMenu } from './StatusMenu';

export const COLUMN_WIDTH = 340;

export function DragHandleIcon() {
  return <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} />;
}

interface StatusColumnProps {
  status: Status;
  count: number;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  /** Replaces the grip in the header; the sortable wrapper passes the real drag handle. */
  dragHandle?: ReactNode;
  children: ReactNode;
}

/** One board column: header (grip, dot, name, count, add, menu) and a scrollable list of cards. */
export function StatusColumn({
  status,
  count,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  dragHandle,
  children,
}: StatusColumnProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      sx={(theme) => ({
        width: COLUMN_WIDTH,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        bgcolor: theme.palette.surface.column,
      })}
    >
      <Box sx={{ height: 46, flexShrink: 0, display: 'flex', alignItems: 'center', pl: '6px', pr: '7px', gap: '9px' }}>
        {dragHandle ?? <DragHandleIcon />}
        <StatusDot color={status.color} />
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {status.name}
        </Typography>
        <CountBadge count={count} sx={{ ml: '3px' }} />
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex' }}>
        <IconButton size="small" aria-label={`Add issue to ${status.name}`} sx={{ p: '1px' }}>
          <AddIcon />
        </IconButton>
        <IconButton
          size="small"
          aria-label={`${status.name} column menu`}
          aria-haspopup="menu"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={{ p: '1px' }}
        >
          <MoreVertIcon />
        </IconButton>
        </Box>
      </Box>
      <StatusMenu
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        onMoveLeft={onMoveLeft}
        onMoveRight={onMoveRight}
      />
      <Box
        sx={[
          {
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            scrollbarGutter: 'stable',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pt: '9px',
            pb: 1.5,
            pl: 1.5,
            pr: 1.5,
          },
          thinScrollbar,
        ]}
      >
        {children}
      </Box>
    </Box>
  );
}
