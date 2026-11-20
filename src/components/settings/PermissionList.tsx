import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { thinScrollbar } from '../../theme';
import type { Permission } from '../../types';
import { lockedKeys, permissionGroupId, permissionGroupLabel, withImplied } from '../../utils/permissions';
import { fieldHeight } from './fieldSx';

interface PermissionListProps {
  catalog: Permission[];
  /** Keys the role has (the draft). */
  enabled: string[];
  disabled: boolean;
  onChange: (keys: string[]) => void;
  /** Puts the permissions back to what is saved. */
  onReset: () => void;
  /** Space above the header row. The role editors use less when no hint sits above the list. */
  topPadding?: string;
}

interface Group {
  id: string;
  label: string;
  items: Permission[];
}

function groupsOf(catalog: Permission[]): Group[] {
  const groups: Group[] = [];
  for (const item of catalog) {
    const id = permissionGroupId(item.key);
    const group = groups.find((g) => g.id === id);
    if (group) group.items.push(item);
    else groups.push({ id, label: permissionGroupLabel(id), items: [item] });
  }
  return groups;
}

function matches(item: Permission, query: string): boolean {
  return `${item.name} ${item.description ?? ''}`.toLowerCase().includes(query);
}

/** Header with the count, a search field and Reset, then the permissions in groups with "Enable all". */
export function PermissionList({ catalog, enabled, disabled, onChange, onReset, topPadding = '21px' }: PermissionListProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const enabledSet = new Set(enabled);
  const groups = groupsOf(catalog);
  const locked = lockedKeys(enabled);
  const enabledCount = catalog.filter((p) => enabledSet.has(p.key)).length;

  const toggle = (key: string, on: boolean) => {
    const next = new Set(enabledSet);
    if (on) next.add(key);
    else next.delete(key);
    onChange(withImplied([...next]));
  };

  const toggleGroup = (group: Group, on: boolean) => {
    const next = new Set(enabledSet);
    for (const item of group.items) {
      if (on) next.add(item.key);
      else next.delete(item.key);
    }
    onChange(withImplied([...next]));
  };

  return (
    <>
      <Box sx={{ px: 3, pt: topPadding, pb: 1, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Typography variant="h2" sx={{ fontSize: 18, lineHeight: '26px' }}>
          Permissions
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {enabledCount} of {catalog.length} enabled
        </Typography>
        <TextField
          size="small"
          placeholder="Search by name or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'Search permissions', maxLength: 100 },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 280, ...fieldHeight(32) }}
        />
        <Button onClick={onReset} disabled={disabled} sx={{ height: 32, fontWeight: 500, minWidth: 0, px: 0.5 }}>
          Reset
        </Button>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', borderTop: 1, borderColor: 'divider', ...thinScrollbar }}>
        {groups.map((group) => {
          const visible = group.items.filter((item) => query === '' || matches(item, query));
          if (visible.length === 0) return null;
          const onCount = group.items.filter((item) => enabledSet.has(item.key)).length;
          const allOn = onCount === group.items.length;
          return (
            <Box key={group.id} component="section" aria-label={group.label}>
              <Box
                sx={{
                  minHeight: 62,
                  px: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: 'surface.groupHeader',
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {group.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {allOn ? `All ${group.items.length} permissions enabled` : `${onCount} of ${group.items.length} enabled`}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Enable all
                </Typography>
                <Switch
                  checked={allOn}
                  disabled={disabled}
                  onChange={(event) => toggleGroup(group, event.target.checked)}
                  slotProps={{ input: { 'aria-label': `Enable all ${group.label} permissions` } }}
                />
              </Box>
              {visible.map((item) => (
                <Box
                  key={item.key}
                  sx={{ minHeight: 52, px: 3, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                  <Switch
                    checked={enabledSet.has(item.key)}
                    disabled={disabled || locked.has(item.key)}
                    onChange={(event) => toggle(item.key, event.target.checked)}
                    slotProps={{ input: { 'aria-label': item.name } }}
                  />
                </Box>
              ))}
            </Box>
          );
        })}
        {query !== '' && groups.every((g) => g.items.every((item) => !matches(item, query))) && (
          <Typography color="text.secondary" sx={{ p: 3 }}>
            No permissions match “{search.trim()}”.
          </Typography>
        )}
      </Box>
    </>
  );
}
