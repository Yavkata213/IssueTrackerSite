import ShieldIcon from '@mui/icons-material/Shield';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

interface RoleAvatarProps {
  size: number;
  /** Selected roles get the primary tint; others are grey. */
  selected: boolean;
}

/** Round shield marker of a role. */
export function RoleAvatar({ size, selected }: RoleAvatarProps) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: selected ? (t) => alpha(t.palette.primary.main, 0.12) : 'action.selected',
        color: selected ? 'primary.main' : 'text.secondary',
      }}
    >
      <ShieldIcon sx={{ fontSize: size * 0.5 }} />
    </Box>
  );
}
