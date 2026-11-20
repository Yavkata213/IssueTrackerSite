import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Box from '@mui/material/Box';
import type { IsoDate, IsoTimestamp } from '../../types';
import { getDueInfo } from '../../utils/dates';

interface DueDateLabelProps {
  issue: { dueDate: IsoDate | null; completedAt: IsoTimestamp | null };
  /** Board cards show a leading icon, table rows show text only. */
  showIcon?: boolean;
}

/** Relative due date ("Today", "Overdue 2 d") or, for completed issues, "Done 2 days ago". */
export function DueDateLabel({ issue, showIcon = false }: DueDateLabelProps) {
  const info = getDueInfo(issue);
  if (!info) return null;

  const color = info.tone === 'overdue' ? 'error.main' : 'text.primary';
  const Icon = info.tone === 'done' ? CheckCircleIcon : CalendarTodayOutlinedIcon;
  const iconColor = info.tone === 'done' ? 'success.main' : info.tone === 'overdue' ? 'error.main' : 'text.secondary';

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color }}>
      {showIcon && <Icon sx={{ fontSize: 14, color: iconColor }} />}
      {info.text}
    </Box>
  );
}
