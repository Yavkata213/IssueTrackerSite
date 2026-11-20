import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import RemoveIcon from '@mui/icons-material/Remove';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import type { Priority } from '../../types';

const LABELS: Record<Exclude<Priority, 'NONE'>, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const ICONS = {
  URGENT: KeyboardDoubleArrowUpIcon,
  HIGH: KeyboardArrowUpIcon,
  MEDIUM: RemoveIcon,
  LOW: KeyboardArrowDownIcon,
} as const;

interface PriorityChipProps {
  priority: Priority;
  /** Board cards show an icon, table rows show text only. */
  showIcon?: boolean;
}

/** Priority label. Renders nothing for `NONE`. */
export function PriorityChip({ priority, showIcon = false }: PriorityChipProps) {
  const { palette } = useTheme();
  if (priority === 'NONE') return null;

  const color = palette.priority[priority];
  const Icon = ICONS[priority];
  return (
    <Chip
      size="small"
      label={LABELS[priority]}
      icon={showIcon ? <Icon sx={{ fontSize: '14px !important', color: `${color} !important` }} /> : undefined}
      sx={{
        height: showIcon ? 20 : 24,
        borderRadius: showIcon ? '10px' : '12px',
        fontSize: showIcon ? 11 : 12,
        fontWeight: 500,
        color,
        bgcolor: alpha(color, 0.12),
        '& .MuiChip-label': { pl: showIcon ? 0.75 : 1.5, pr: showIcon ? 1 : 1.5 },
        '& .MuiChip-icon': { ml: 1, mr: 0 },
      }}
    />
  );
}
