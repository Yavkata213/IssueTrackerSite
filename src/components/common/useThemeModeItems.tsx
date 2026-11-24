import CheckIcon from '@mui/icons-material/Check';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import { useThemeMode } from '../../app/themeModeContext';
import type { ThemeModePreference } from '../../app/themeModeContext';

const OPTIONS: { value: ThemeModePreference; label: string; icon: typeof CheckIcon }[] = [
  { value: 'light', label: 'Light', icon: LightModeOutlinedIcon },
  { value: 'dark', label: 'Dark', icon: DarkModeOutlinedIcon },
  { value: 'system', label: 'System', icon: SettingsBrightnessOutlinedIcon },
];

/**
 * The entries of a theme menu: a "Theme" heading and Light / Dark / System. They are returned as
 * an array because a MUI Menu does not accept a fragment as a child. `onPick` runs after a choice.
 */
export function useThemeModeItems(onPick?: () => void) {
  const { preference, setPreference } = useThemeMode();
  return [
    <ListSubheader key="heading" sx={{ lineHeight: '32px', bgcolor: 'transparent' }}>
      Theme
    </ListSubheader>,
    ...OPTIONS.map(({ value, label, icon: Icon }) => (
      <MenuItem
        key={value}
        selected={preference === value}
        onClick={() => {
          setPreference(value);
          onPick?.();
        }}
      >
        <ListItemIcon>
          <Icon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{label}</ListItemText>
        {preference === value && <CheckIcon fontSize="small" sx={{ ml: 2, color: 'primary.main' }} />}
      </MenuItem>
    )),
  ];
}
