import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

interface CountBadgeProps {
  count: number;
  /** Background colour; defaults to the neutral count pill of status headers. */
  background?: string;
  sx?: SxProps<Theme>;
}

/** Small grey pill with a number: status column counts, the unread count in the sidebar. */
export function CountBadge({ count, background, sx }: CountBadgeProps) {
  return (
    <Box
      component="span"
      sx={[
        (theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 28,
          height: 22,
          px: 0.75,
          borderRadius: '11px',
          bgcolor: background ?? theme.palette.surface.columnCount,
          color: 'text.secondary',
          fontSize: 12,
          fontWeight: 400,
          lineHeight: 1,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {count}
    </Box>
  );
}
