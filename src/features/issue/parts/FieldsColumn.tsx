import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { useWorkspace } from '../../../app/workspaceContext';
import { StatusDot, UserAvatar } from '../../../components/common';
import { fieldHeight } from '../../../components/settings';
import type { IssueDetailData, IssuePatch, Priority } from '../../../types';
import { safeColor } from '../../../utils/colors';
import { LIMITS } from '../../../utils/limits';
import { shortName } from '../../../utils/names';
import { hasPermission, PERMISSION } from '../../../utils/permissions';

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <Box>
      <Typography variant="caption" component="label" htmlFor={htmlFor} color="text.secondary" sx={{ display: 'block', mb: '8px' }}>
        {label}
      </Typography>
      {children}
      {hint && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: '8px', mb: '7px' }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

function Dot({ color }: { color: string }) {
  return <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: color }} />;
}

function ValueRow({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>{children}</Box>;
}

/** "Andrey N., Maria K. +1": the first two names, then how many more. */
function assigneeSummary(names: string[]): string {
  if (names.length === 0) return 'Unassigned';
  const shown = names.slice(0, 2).join(', ');
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

interface FieldsColumnProps {
  detail: IssueDetailData;
  patch: (patch: IssuePatch) => void;
}

/** Status, priority, categories, assignees, effort and due date. Every field saves as soon as it changes. */
export function FieldsColumn({ detail, patch }: FieldsColumnProps) {
  const { palette } = useTheme();
  const { currentUser } = useWorkspace();
  const { issue, permissions } = detail;
  const canEdit = hasPermission(permissions, PERMISSION.issueEdit);
  const canMove = hasPermission(permissions, PERMISSION.issueMove);
  const canAssignOthers = hasPermission(permissions, PERMISSION.issueAssignOthers);
  const canAssignSelf = hasPermission(permissions, PERMISSION.issueAssignSelf);
  const ids = {
    status: useId(),
    priority: useId(),
    categories: useId(),
    assignees: useId(),
    effort: useId(),
    due: useId(),
  };

  const status = detail.statuses.find((s) => s.id === issue.statusId);
  const selectedCategories = detail.categories.filter((c) => detail.categoryIds.includes(c.id));
  const assignedUsers = detail.assignableUsers.filter((u) => detail.assigneeIds.includes(u.id));
  const priorityColor = issue.priority === 'NONE' ? palette.grey[500] : palette.priority[issue.priority];

  // Effort: shown as "8 h"; while it is edited it is the bare number.
  const [effortDraft, setEffortDraft] = useState<string | null>(null);
  const [effortError, setEffortError] = useState<string | undefined>();
  const effortShown = effortDraft ?? (issue.effortHours === null ? '' : `${issue.effortHours} h`);

  const commitEffort = () => {
    if (effortDraft === null) return;
    const text = effortDraft.trim().replace(',', '.');
    if (text === '') {
      if (issue.effortHours !== null) patch({ effortHours: null });
    } else {
      const hours = Number(text);
      if (!Number.isFinite(hours) || hours < 0 || hours > LIMITS.effortHoursMax) {
        setEffortError(`Enter hours between 0 and ${LIMITS.effortHoursMax}.`);
        return;
      }
      if (hours !== issue.effortHours) patch({ effortHours: hours });
    }
    setEffortError(undefined);
    setEffortDraft(null);
  };

  const changeAssignees = (next: string[]) => {
    if (canAssignOthers) {
      patch({ assigneeIds: next });
      return;
    }
    // With only `issue.assign.self` the user can add or remove themself, nobody else.
    const others = detail.assigneeIds.filter((id) => id !== currentUser.id);
    patch({ assigneeIds: next.includes(currentUser.id) ? [...others, currentUser.id] : others });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', ...fieldHeight(44) }}>
      <Field label="Status" htmlFor={ids.status}>
        <Select
          id={ids.status}
          fullWidth
          value={status?.id ?? ''}
          disabled={!canMove}
          onChange={(event) => patch({ statusId: event.target.value })}
          renderValue={() => (
            <ValueRow>
              <StatusDot color={status?.color ?? null} />
              {status?.name}
            </ValueRow>
          )}
        >
          {detail.statuses.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              <ValueRow>
                <StatusDot color={option.color} />
                {option.name}
              </ValueRow>
            </MenuItem>
          ))}
        </Select>
      </Field>

      <Field label="Priority" htmlFor={ids.priority}>
        <Select
          id={ids.priority}
          fullWidth
          value={issue.priority}
          disabled={!canEdit}
          onChange={(event) => patch({ priority: event.target.value })}
          renderValue={(value) => (
            <ValueRow>
              <Dot color={priorityColor} />
              {PRIORITY_OPTIONS.find((o) => o.value === value)?.label}
            </ValueRow>
          )}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <ValueRow>
                <Dot color={option.value === 'NONE' ? palette.grey[500] : palette.priority[option.value]} />
                {option.label}
              </ValueRow>
            </MenuItem>
          ))}
        </Select>
      </Field>

      <Field label="Categories" htmlFor={ids.categories}>
        <Select
          id={ids.categories}
          fullWidth
          multiple
          displayEmpty
          value={detail.categoryIds}
          disabled={!canEdit}
          onChange={(event) => {
            const value = event.target.value;
            patch({ categoryIds: typeof value === 'string' ? value.split(',') : value });
          }}
          renderValue={() =>
            selectedCategories.length === 0 ? (
              <Typography component="span" color="text.disabled">
                None
              </Typography>
            ) : (
              <ValueRow>
                <Dot color={safeColor(selectedCategories[0].color, palette.grey[500])} />
                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedCategories.map((c) => c.name).join(', ')}
                </Box>
              </ValueRow>
            )
          }
        >
          {detail.categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              <Checkbox size="small" checked={detail.categoryIds.includes(category.id)} sx={{ ml: -1 }} />
              <Dot color={safeColor(category.color, palette.grey[500])} />
              <ListItemText primary={category.name} sx={{ ml: 1.5 }} />
            </MenuItem>
          ))}
        </Select>
      </Field>

      <Field label="Assignees" htmlFor={ids.assignees} hint="Pick one or more people. Section staff can adjust later.">
        <Select
          id={ids.assignees}
          fullWidth
          multiple
          displayEmpty
          value={detail.assigneeIds}
          disabled={!canAssignOthers && !canAssignSelf}
          onChange={(event) => {
            const value = event.target.value;
            changeAssignees(typeof value === 'string' ? value.split(',') : value);
          }}
          renderValue={() => (
            <ValueRow>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'transparent', color: 'action.active', border: '1px dashed', borderColor: 'text.disabled' }}>
                <PersonOutlinedIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {assigneeSummary(assignedUsers.map((u) => shortName(u.displayName)))}
              </Box>
            </ValueRow>
          )}
        >
          {detail.assignableUsers.map((user) => (
            <MenuItem
              key={user.id}
              value={user.id}
              // Without `issue.assign.others` only the user themself can be picked.
              disabled={!canAssignOthers && user.id !== currentUser.id}
            >
              <Checkbox size="small" checked={detail.assigneeIds.includes(user.id)} sx={{ ml: -1 }} />
              <UserAvatar user={user} size={24} />
              <ListItemText primary={user.displayName} sx={{ ml: 1.5 }} />
            </MenuItem>
          ))}
        </Select>
      </Field>

      <Field label="Effort estimate" htmlFor={ids.effort}>
        <TextField
          id={ids.effort}
          fullWidth
          size="small"
          value={effortShown}
          disabled={!canEdit}
          error={effortError !== undefined}
          helperText={effortError}
          placeholder="Not estimated"
          onFocus={() => setEffortDraft(issue.effortHours === null ? '' : String(issue.effortHours))}
          onChange={(event) => setEffortDraft(event.target.value)}
          onBlur={commitEffort}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.querySelector('input')?.blur();
          }}
          slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 7 } }}
        />
      </Field>

      <Field label="Due date" htmlFor={ids.due}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={issue.dueDate ? dayjs(issue.dueDate) : null}
            onChange={(value) => {
              if (value === null) patch({ dueDate: null });
              else if (value.isValid()) patch({ dueDate: value.format('YYYY-MM-DD') });
            }}
            disabled={!canEdit}
            format="ddd, D MMM YYYY"
            slotProps={{
              textField: { id: ids.due, fullWidth: true, size: 'small' },
              field: { clearable: true },
              inputAdornment: { position: 'start' },
            }}
          />
        </LocalizationProvider>
      </Field>
    </Box>
  );
}
