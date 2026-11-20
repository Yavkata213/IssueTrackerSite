import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { safeColor } from '../../utils/colors';

interface StatusDotProps {
  color: string | null;
}

/** Coloured dot in front of a status name. */
export function StatusDot({ color }: StatusDotProps) {
  const { palette } = useTheme();
  return (
    <Box
      component="span"
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: safeColor(color, palette.grey[500]),
      }}
    />
  );
}
