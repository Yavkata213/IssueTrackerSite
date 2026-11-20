import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AssigneeGroup,
  CategoryChips,
  CountBadge,
  DueDateLabel,
  PriorityChip,
  StatusDot,
} from '../../../components/common';
import { SCROLLBAR_SIZE, thinScrollbar } from '../../../theme';
import type { Category, IssueListItem, Status, User } from '../../../types';
import { formatIssueId } from '../filters';

// ID | Title | Category | Priority | Assignee | Due date | Effort
const GRID_COLUMNS = '76px minmax(0, 1fr) 200px 140px 160px 240px 227px';
const ROW_PADDING_LEFT = 24;

interface TableViewProps {
  sectionKey: string;
  /** Groups in display order. */
  statuses: Status[];
  /** Issues to show (already filtered). */
  issues: IssueListItem[];
  categoriesById: Map<string, Category>;
  usersById: Map<string, User>;
  /** A click on a row opens the issue. */
  onOpenIssue: (issueId: string) => void;
}

function Empty() {
  return (
    <Box component="span" sx={{ color: 'text.disabled' }}>
      —
    </Box>
  );
}

function Row({ children, height, sx, onOpen, label }: { children: ReactNode; height: number; sx?: object; onOpen?: () => void; label?: string }) {
  return (
    <Box
      {...(onOpen && {
        role: 'button',
        tabIndex: 0,
        'aria-label': label,
        onClick: onOpen,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
          }
        },
      })}
      sx={{
        ...(onOpen && { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }),
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        alignItems: 'center',
        height,
        pl: `${ROW_PADDING_LEFT}px`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Table view: issues grouped by status, collapsible groups, sticky header, scrollable body. */
export function TableView({ sectionKey, statuses, issues, categoriesById, usersById, onOpenIssue }: TableViewProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const toggle = (statusId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      return next;
    });

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Row height={40} sx={{ flexShrink: 0, pr: `${SCROLLBAR_SIZE}px`, borderBottom: 1, borderColor: 'divider' }}>
        {['ID', 'Title', 'Category', 'Priority', 'Assignee', 'Due date', 'Effort'].map((label) => (
          <Typography key={label} variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
        ))}
      </Row>
      <Box
        sx={[{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable' }, thinScrollbar]}
      >
        {statuses.map((status) => {
          const groupIssues = issues
            .filter((issue) => issue.statusId === status.id)
            .sort((a, b) => a.boardPosition - b.boardPosition);
          const isCollapsed = collapsed.has(status.id);
          const Chevron = isCollapsed ? ChevronRightIcon : ExpandMoreIcon;

          return (
            <Box key={status.id}>
              <ButtonBase
                onClick={() => toggle(status.id)}
                aria-expanded={!isCollapsed}
                sx={(theme) => ({
                  width: '100%',
                  height: 40,
                  pl: '20px',
                  gap: 1.25,
                  justifyContent: 'flex-start',
                  bgcolor: theme.palette.surface.groupHeader,
                  borderBottom: 1,
                  borderColor: 'divider',
                })}
              >
                <Chevron sx={{ color: 'action.active' }} />
                <StatusDot color={status.color} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {status.name}
                </Typography>
                <CountBadge count={groupIssues.length} />
              </ButtonBase>
              {!isCollapsed &&
                groupIssues.map((issue) => (
                  <Row
                    key={issue.id}
                    height={52}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                    onOpen={() => onOpenIssue(issue.id)}
                    label={`Open ${formatIssueId(sectionKey, issue.number)} ${issue.title}`}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {formatIssueId(sectionKey, issue.number)}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ pr: 2 }}>
                      {issue.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
                      <CategoryChips density="row" categories={issue.categoryIds.flatMap((id) => categoriesById.get(id) ?? [])} />
                    </Box>
                    <Box>{issue.priority === 'NONE' ? <Empty /> : <PriorityChip priority={issue.priority} />}</Box>
                    <Box>
                      <AssigneeGroup
                        align="start"
                        assignees={issue.assigneeIds.flatMap((id) => usersById.get(id) ?? [])}
                      />
                    </Box>
                    <Typography variant="body2" component="div">
                      {issue.dueDate || issue.completedAt ? <DueDateLabel issue={issue} /> : <Empty />}
                    </Typography>
                    <Typography variant="body2" component="div">
                      {issue.effortHours !== null ? `${issue.effortHours} h` : <Empty />}
                    </Typography>
                  </Row>
                ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
