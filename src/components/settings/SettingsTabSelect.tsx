import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

interface SettingsTabSelectProps<T extends string> {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (tab: T) => void;
  /** `full`: a hairline across the page. `select`: only under the dropdown (the tab has its own tab strip). */
  divider?: 'full' | 'select';
}

/** Dropdown that switches between the settings areas, above a divider. */
export function SettingsTabSelect<T extends string>({ tabs, value, onChange, divider = 'full' }: SettingsTabSelectProps<T>) {
  return (
    <Box sx={{ pb: '10px', borderBottom: divider === 'full' ? 1 : 0, borderColor: 'divider', flexShrink: 0 }}>
      <Box sx={{ width: 320, pb: divider === 'select' ? '8px' : 0, borderBottom: divider === 'select' ? 1 : 0, borderColor: 'divider' }}>
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          inputProps={{ 'aria-label': 'Settings area' }}
          sx={{ width: 320, height: 44, fontWeight: 500 }}
        >
          {tabs.map((tab) => (
            <MenuItem key={tab.value} value={tab.value}>
              {tab.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
}
