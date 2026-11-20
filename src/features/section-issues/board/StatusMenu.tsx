import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PaletteIcon from '@mui/icons-material/Palette';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

interface StatusMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

/**
 * Column menu. Only "Move left" and "Move right" are wired up; rename, colour and remove
 * have no dialogs in the design yet and just close the menu.
 */
export function StatusMenu({
  anchorEl,
  onClose,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
}: StatusMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: 204, mt: 0.5 } }, list: { dense: false, sx: { py: 0.5 } } }}
    >
      <MenuItem onClick={onClose} sx={{ minHeight: 36 }}>
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Rename status</ListItemText>
      </MenuItem>
      <MenuItem onClick={onClose} sx={{ minHeight: 36 }}>
        <ListItemIcon>
          <PaletteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Colour</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem
        disabled={!canMoveLeft}
        onClick={() => {
          onMoveLeft();
          onClose();
        }}
        sx={{ minHeight: 36 }}
      >
        <ListItemIcon>
          <ArrowBackIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Move left</ListItemText>
      </MenuItem>
      <MenuItem
        disabled={!canMoveRight}
        onClick={() => {
          onMoveRight();
          onClose();
        }}
        sx={{ minHeight: 36 }}
      >
        <ListItemIcon>
          <ArrowForwardIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Move right</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={onClose} sx={{ minHeight: 36, color: 'error.main' }}>
        <ListItemIcon sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Remove status</ListItemText>
      </MenuItem>
    </Menu>
  );
}
