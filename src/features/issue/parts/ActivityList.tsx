import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ActivityEntry } from '../../../types';
import { formatActivityTime } from '../../../utils/dates';
import { shortName } from '../../../utils/names';

/** Assignment history as grey text with a thin timeline, below the details. */
export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Box component="section" aria-label="Activity">
      <Typography variant="body2" sx={{ fontWeight: 500, mb: '14px' }}>
        Activity
      </Typography>
      {entries.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Nobody has been assigned yet.
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, position: 'relative' }}>
          {entries.map((entry, index) => (
            <Box
              component="li"
              key={entry.id}
              sx={{
                position: 'relative',
                pl: '18px',
                pb: index === entries.length - 1 ? 0 : '14px',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 3,
                  top: 4,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: 'text.disabled',
                },
                '&:not(:last-child)::after': {
                  content: '""',
                  position: 'absolute',
                  left: 6,
                  top: 12,
                  bottom: -2,
                  width: '1px',
                  bgcolor: 'divider',
                },
              }}
            >
              <Typography variant="caption" color="text.secondary" component="div">
                {shortName(entry.user.displayName)} was {entry.event === 'ASSIGNED' ? 'assigned' : 'unassigned'}
                {entry.actor ? ` by ${shortName(entry.actor.displayName)}` : ''}
              </Typography>
              <Typography variant="caption" color="text.disabled" component="div">
                {formatActivityTime(entry.createdAt)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
