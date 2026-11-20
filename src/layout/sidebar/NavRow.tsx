import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface NavRowProps {
  selected: boolean;
  icon: ReactNode;
  label: string;
  /** Shown at the right edge, e.g. the unread count. */
  trailing?: ReactNode;
  /** Makes the row a link. Without it the row is a static picture (the icon preview). */
  to?: string;
}

/** 40 px sidebar row. The selected row gets the primary tint; its icon and text turn blue. */
export function NavRow({ selected, icon, label, trailing, to }: NavRowProps) {
  const sx = {
    height: 40,
    px: '10px',
    gap: '10px',
    '& .nav-icon': { display: 'flex', color: selected ? 'primary.main' : 'action.active' },
    '&:hover .pin-action, &:focus-within .pin-action': { visibility: 'visible' },
  } as const;

  const content = (
    <>
      <Box className="nav-icon">{icon}</Box>
      <Box
        component="span"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 14,
          color: selected ? 'primary.main' : 'text.primary',
        }}
      >
        {label}
      </Box>
      {trailing}
    </>
  );

  if (to === undefined) {
    return (
      <ListItemButton component="div" selected={selected} disableRipple tabIndex={-1} sx={{ ...sx, cursor: 'default' }}>
        {content}
      </ListItemButton>
    );
  }
  return (
    <ListItemButton component={NavLink} to={to} selected={selected} sx={sx}>
      {content}
    </ListItemButton>
  );
}
