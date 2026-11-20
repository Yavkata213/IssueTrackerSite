import InfoIcon from '@mui/icons-material/Info';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface SaveBarProps {
  /** What saving does, e.g. "Changes apply to 14 issues and are saved to the workspace audit log." */
  message: string;
  onDiscard: () => void;
  onSave: () => void;
  saving?: boolean;
  /** Blocks saving while the form has errors. */
  saveDisabled?: boolean;
}

/**
 * Floating bar with Discard and Save changes, shown while a form has unsaved changes.
 * Centered at the bottom of the nearest positioned ancestor (22 px from the edge).
 */
export function SaveBar({ message, onDiscard, onSave, saving = false, saveDisabled = false }: SaveBarProps) {
  return (
    <Box
      role="region"
      aria-label="Unsaved changes"
      sx={{
        position: 'absolute',
        left: '50%',
        bottom: 22,
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        height: 58,
        pl: '22px',
        pr: '12px',
        maxWidth: 'calc(100% - 32px)',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 6,
      }}
    >
      <InfoIcon sx={{ fontSize: 16, color: 'action.active' }} />
      <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
        {message}
      </Typography>
      <Button onClick={onDiscard} disabled={saving} sx={{ ml: 1.5, fontWeight: 500 }}>
        Discard
      </Button>
      <Button variant="contained" onClick={onSave} disabled={saving || saveDisabled} sx={{ height: 42, px: 2, fontWeight: 500 }}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </Box>
  );
}
