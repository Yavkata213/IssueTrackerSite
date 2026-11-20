import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { alpha } from '@mui/material/styles';
import { SelectButton } from '../../components/common';
import type { SelectOption } from '../../components/common';
import type { IssueFilterState } from './filters';

export type IssueView = 'board' | 'table';
export type GroupBy = 'status';

const VIEW_OPTIONS: SelectOption<IssueView>[] = [
  { value: 'board', label: 'Board' },
  { value: 'table', label: 'Table' },
];

const GROUP_BY_OPTIONS: SelectOption<GroupBy>[] = [{ value: 'status', label: 'Status' }];

interface IssueToolbarProps {
  filters: IssueFilterState;
  onFiltersChange: (filters: IssueFilterState) => void;
  overdueCount: number;
  view: IssueView;
  onViewChange: (view: IssueView) => void;
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
}

export function IssueToolbar({
  filters,
  onFiltersChange,
  overdueCount,
  view,
  onViewChange,
  groupBy,
  onGroupByChange,
}: IssueToolbarProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search"
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          slotProps={{
            htmlInput: { 'aria-label': 'Search issues' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'action.active' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 196, '& .MuiOutlinedInput-root': { height: 40 } }}
        />
        <Chip
          label="Only my issues"
          clickable
          aria-pressed={filters.onlyMine}
          onClick={() => onFiltersChange({ ...filters, onlyMine: !filters.onlyMine })}
          variant="outlined"
          sx={(theme) => ({
            height: 28,
            borderRadius: '14px',
            bgcolor: 'background.paper',
            '& .MuiChip-label': { px: 2 },
            borderColor: 'rgba(0, 0, 0, 0.23)',
            ...(filters.onlyMine && {
              color: 'primary.main',
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            }),
          })}
        />
        <Chip
          label={`Overdue · ${overdueCount}`}
          clickable
          aria-pressed={filters.overdueOnly}
          onClick={() => onFiltersChange({ ...filters, overdueOnly: !filters.overdueOnly })}
          variant="outlined"
          sx={(theme) => ({
            height: 28,
            borderRadius: '14px',
            '& .MuiChip-label': { px: '20px' },
            color: 'error.main',
            borderColor: 'error.main',
            bgcolor: filters.overdueOnly ? alpha(theme.palette.error.main, 0.12) : 'background.paper',
          })}
        />
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          endIcon={<ExpandMoreIcon />}
          sx={{ height: 40, px: 1.5, ml: 0.5 }}
        >
          Filter
        </Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SelectButton label="View" value={view} options={VIEW_OPTIONS} onChange={onViewChange} />
        <SelectButton label="Group by" value={groupBy} options={GROUP_BY_OPTIONS} onChange={onGroupByChange} />
      </Box>
    </Box>
  );
}
