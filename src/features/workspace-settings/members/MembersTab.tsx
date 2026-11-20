import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { getErrorMessage, listWorkspaceMembers } from '../../../api';
import { LoadError } from '../../../components/common';
import type {
  MemberSort,
  MemberStatusFilter,
  RoleDetail,
  Section,
  WorkspaceMemberPage,
  WorkspaceMemberQuery,
} from '../../../types';
import { LIMITS } from '../../../utils/limits';
import { hasPermission, PERMISSION } from '../../../utils/permissions';
import { MembersTable } from './MembersTable';

const PAGE_SIZE = 10;
const ALL = 'ALL';

const SORT_LABELS: Record<MemberSort, string> = { name: 'Name', lastActive: 'Last active', joined: 'Joined' };

type Filters = Omit<WorkspaceMemberQuery, 'pageSize'>;

const INITIAL_FILTERS: Filters = { search: '', roleId: null, sectionId: null, status: 'ALL', sort: 'name', page: 0 };

/** A filter dropdown that shows its name and value inside the field: "Workspace role  All". */
function FilterSelect({
  label,
  value,
  valueLabel,
  width,
  onChange,
  children,
}: {
  label: string;
  value: string;
  valueLabel: string;
  width: number;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Select
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      renderValue={() => (
        <>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {label}
          </Box>{' '}
          {valueLabel}
        </>
      )}
      inputProps={{ 'aria-label': label }}
      sx={{ width, height: 40 }}
    >
      {children}
    </Select>
  );
}

/** Tab text with the count pill after it, on one line. */
function TabLabel({ text, count, active }: { text: string; count: number | undefined; active: boolean }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
      {text}
      {count !== undefined && <CountPill count={count} active={active} />}
    </Box>
  );
}

function CountPill({ count, active }: { count: number; active: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        ml: '12px',
        minWidth: 24,
        height: 20,
        px: '8px',
        borderRadius: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 400,
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.12) : 'action.selected',
      }}
    >
      {count}
    </Box>
  );
}

interface MembersTabProps {
  workspaceId: string;
  roles: RoleDetail[];
  sections: Section[];
  /** Workspace permission keys of the current user. */
  permissions: string[];
}

/** Members of the workspace: status tabs, filters, a scrolling table and pagination. */
export function MembersTab({ workspaceId, roles, sections, permissions }: MembersTabProps) {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [searchText, setSearchText] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; page: WorkspaceMemberPage } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);

  const key = `${attempt}:${JSON.stringify(filters)}`;

  // The query is sent a moment after the user stops typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.search === searchText.trim() ? current : { ...current, search: searchText.trim(), page: 0 },
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    listWorkspaceMembers(workspaceId, { ...filters, pageSize: PAGE_SIZE })
      .then((page) => {
        if (!cancelled) setResult({ key, page });
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure({ key, message: getErrorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, filters, key]);

  const update = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, page: 0, ...patch }));

  const page = result?.page;
  const loading = result?.key !== key;
  const failed = failure?.key === key ? failure.message : null;
  const total = page?.total ?? 0;
  const from = total === 0 ? 0 : filters.page * PAGE_SIZE + 1;
  const to = Math.min(total, (filters.page + 1) * PAGE_SIZE);
  const counts = page?.counts;
  const canAdd =
    hasPermission(permissions, PERMISSION.workspaceMembersCreate) || hasPermission(permissions, PERMISSION.workspaceMembersInvite);

  const roleName = roles.find((r) => r.id === filters.roleId)?.name ?? 'All';
  const sectionName = sections.find((s) => s.id === filters.sectionId)?.name ?? 'All';

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: 4 }}>
      <Box sx={{ position: 'relative', flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={filters.status}
          onChange={(_event, value: MemberStatusFilter) => update({ status: value })}
          aria-label="Member status"
          sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, minWidth: 0, px: '20px', fontWeight: 500 } }}
        >
          <Tab value="ALL" label={<TabLabel text="All members" count={counts?.all} active={filters.status === 'ALL'} />} />
          <Tab value="ACTIVE" label={<TabLabel text="Active" count={counts?.active} active={filters.status === 'ACTIVE'} />} />
          {/* Invitations (the invitations table) are not part of the list yet. */}
          <Tab value="INVITED" label="Invited" disabled />
          <Tab
            value="DEACTIVATED"
            label={<TabLabel text="Deactivated" count={counts?.deactivated} active={filters.status === 'DEACTIVATED'} />}
          />
        </Tabs>
        {canAdd && (
          // Opens the add-user flow; it is specified later, so the button has no action yet.
          <Button variant="contained" startIcon={<PersonAddIcon />} sx={{ position: 'absolute', right: 2, top: -22, height: 40, minWidth: 140, fontWeight: 500 }}>
            Add user
          </Button>
        )}
      </Box>

      <Box
        sx={{
          mt: 3,
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
        <Box sx={{ height: 64, flexShrink: 0, px: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Search by name or email"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Search members', maxLength: LIMITS.memberSearch },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 300, mr: '4px', '& .MuiOutlinedInput-root': { height: 40 } }}
          />
          <FilterSelect
            label="Workspace role"
            value={filters.roleId ?? ALL}
            valueLabel={roleName}
            width={190}
            onChange={(value) => update({ roleId: value === ALL ? null : value })}
          >
            <MenuItem value={ALL}>All</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Section"
            value={filters.sectionId ?? ALL}
            valueLabel={sectionName}
            width={170}
            onChange={(value) => update({ sectionId: value === ALL ? null : value })}
          >
            <MenuItem value={ALL}>All</MenuItem>
            {sections.map((section) => (
              <MenuItem key={section.id} value={section.id}>
                {section.name}
              </MenuItem>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Status"
            value={filters.status}
            valueLabel={filters.status === 'ALL' ? 'All' : filters.status === 'ACTIVE' ? 'Active' : 'Deactivated'}
            width={150}
            onChange={(value) => update({ status: value as MemberStatusFilter })}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="DEACTIVATED">Deactivated</MenuItem>
          </FilterSelect>
          <Select
            variant="standard"
            disableUnderline
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value })}
            renderValue={(value) => (
              <>
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  Sort by
                </Box>{' '}
                {SORT_LABELS[value]}
              </>
            )}
            inputProps={{ 'aria-label': 'Sort by' }}
            sx={{ ml: 'auto', mr: 3, fontSize: 14 }}
          >
            {(Object.keys(SORT_LABELS) as MemberSort[]).map((sort) => (
              <MenuItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {failed ? (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <LoadError message={failed} onRetry={() => setAttempt((value) => value + 1)} />
          </Box>
        ) : (
          <MembersTable members={page?.items ?? []} loading={loading} ready={page !== undefined} />
        )}

        <Box sx={{ height: 56, flexShrink: 0, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }} aria-live="polite">
            {from}–{to} of {total}
          </Typography>
          <IconButton aria-label="Previous page" disabled={filters.page === 0} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="Next page" disabled={to >= total} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
