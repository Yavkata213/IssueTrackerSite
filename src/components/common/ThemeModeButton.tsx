import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import { useState } from 'react';
import { useThemeMode } from '../../app/themeModeContext';
import { useThemeModeItems } from './useThemeModeItems';

/** Icon button with the theme menu. For pages without the sidebar (sign-in and the like). */
export function ThemeModeButton() {
  const { mode } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const items = useThemeModeItems(() => setAnchor(null));
  const Icon = mode === 'dark' ? DarkModeOutlinedIcon : LightModeOutlinedIcon;

  return (
    <>
      <IconButton aria-label="Theme" aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}>
        <Icon />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {items}
      </Menu>
    </>
  );
}
