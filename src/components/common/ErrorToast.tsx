import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

interface ErrorToastProps {
  /** `null` hides the toast. */
  message: string | null;
  onClose: () => void;
  /** `success` is for a short confirmation such as "Link copied". */
  severity?: 'error' | 'success';
}

/** Short error message for a failed action (for example a move that was rolled back). */
export function ErrorToast({ message, onClose, severity = 'error' }: ErrorToastProps) {
  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={6000}
      onClose={(_event, reason) => {
        if (reason !== 'clickaway') onClose();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={severity} variant="filled" onClose={onClose}>
        {message}
      </Alert>
    </Snackbar>
  );
}
