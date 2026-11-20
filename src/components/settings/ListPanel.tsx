import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { thinScrollbar } from '../../theme';

interface ListPanelProps {
  /** Heading in capitals, e.g. "Roles in IT Support". */
  title: string;
  /** Label of the add button; the button is hidden when `onAdd` is missing. */
  addLabel: string;
  onAdd?: () => void;
  /** The add button gets a tinted circle (roles) or stays plain (categories). */
  addStyle?: 'circle' | 'plain';
  children: ReactNode;
  /** A string is shown as grey caption text; an element (e.g. an Alert) is shown as it is. */
  footer?: ReactNode;
}

/** Left column of the settings tabs: a titled card with an add button and a list of items. */
export function ListPanel({ title, addLabel, onAdd, addStyle = 'circle', children, footer }: ListPanelProps) {
  return (
    <Box
      sx={{
        width: 380,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ height: 48, flexShrink: 0, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
        {onAdd && (
          <IconButton
            aria-label={addLabel}
            onClick={onAdd}
            size="small"
            sx={{
              color: 'primary.main',
              mr: -0.5,
              ...(addStyle === 'circle' && { width: 28, height: 28, bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }),
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, flex: 1, minHeight: 0, overflowY: 'auto', ...thinScrollbar }}>
        {children}
      </Box>
      {typeof footer === 'string' ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 2, flexShrink: 0 }}>
          {footer}
        </Typography>
      ) : (
        footer && <Box sx={{ p: '12px', flexShrink: 0 }}>{footer}</Box>
      )}
    </Box>
  );
}

interface ListPanelItemProps {
  selected: boolean;
  onSelect: () => void;
  /** Round marker on the left: a role shield or a colour dot. */
  leading: ReactNode;
  title: string;
  subtitle: string;
  /** Next to the title, e.g. a "System role" chip. */
  titleAdornment?: ReactNode;
  /** Right edge of the row, e.g. a lock icon. */
  trailing?: ReactNode;
}

/** 64 px row. The selected row is tinted, has a 3 px primary edge and a blue title. */
export function ListPanelItem({ selected, onSelect, leading, title, subtitle, titleAdornment, trailing }: ListPanelItemProps) {
  return (
    <li>
      <ButtonBase
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        sx={{
          width: '100%',
          height: 64,
          px: 2,
          gap: 1.5,
          justifyContent: 'flex-start',
          textAlign: 'left',
          borderLeft: 3,
          borderLeftStyle: 'solid',
          borderLeftColor: selected ? 'primary.main' : 'transparent',
          bgcolor: selected ? (t) => alpha(t.palette.primary.main, 0.08) : 'transparent',
          '&:hover': { bgcolor: selected ? undefined : 'action.hover' },
        }}
      >
        {leading}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: selected ? 'primary.main' : 'text.primary' }}>
              {title}
            </Typography>
            {titleAdornment}
          </Box>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {subtitle}
          </Typography>
        </Box>
        {trailing}
      </ButtonBase>
    </li>
  );
}
