import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';

interface CompleteButtonProps {
  completed: boolean;
  disabled: boolean;
  onClick: () => void;
}

/** "Mark as complete" / "Reopen": only the done flag changes, never the status. */
export function CompleteButton({ completed, disabled, onClick }: CompleteButtonProps) {
  return (
    <Button
      variant="outlined"
      color="success"
      startIcon={<CheckCircleOutlinedIcon />}
      disabled={disabled}
      onClick={onClick}
      sx={{ height: 32, px: 2, whiteSpace: 'nowrap', color: 'success.main', borderColor: (t) => alpha(t.palette.success.main, 0.5) }}
    >
      {completed ? 'Reopen' : 'Mark as complete'}
    </Button>
  );
}
