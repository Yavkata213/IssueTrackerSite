import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import {
  AssigneeGroup,
  CategoryChips,
  DueDateLabel,
  PriorityChip,
} from '../../../components/common';
import type { Category, IssueListItem, User } from '../../../types';

interface IssueCardProps {
  issue: IssueListItem;
  /** Display id, e.g. `IT-148`. */
  issueKey: string;
  categories: Category[];
  assignees: User[];
}

/** Presentational issue card of the board. Dragging is added by `SortableIssueCard`. */
export function IssueCard({ issue, issueKey, categories, assignees }: IssueCardProps) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: '14px', pt: '12px' }}>
        <Box sx={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {issueKey}
          </Typography>
          <PriorityChip priority={issue.priority} showIcon />
        </Box>
        <Typography variant="body2" sx={{ mt: 1, pr: '54px', lineHeight: '18px', overflowWrap: 'anywhere' }}>
          {issue.title}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <CategoryChips categories={categories} />
          {issue.effortHours !== null && (
            <Chip
              size="small"
              variant="outlined"
              icon={<AccessTimeIcon sx={{ fontSize: '12px !important' }} />}
              label={`${issue.effortHours} h`}
              sx={{
                height: 22,
                borderRadius: '11px',
                fontSize: 12,
                borderColor: 'rgba(0, 0, 0, 0.23)',
                '& .MuiChip-label': { pl: '6px', pr: '12px' },
                '& .MuiChip-icon': { ml: '10px', mr: 0 },
              }}
            />
          )}
        </Box>
      </Box>
      <Box
        sx={{
          mt: '12px',
          height: 28,
          px: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: 1,
          borderColor: 'divider',
          fontSize: 12,
        }}
      >
        <DueDateLabel issue={issue} showIcon />
        <Box sx={{ ml: 'auto' }}>
          <AssigneeGroup assignees={assignees} />
        </Box>
      </Box>
    </Box>
  );
}
