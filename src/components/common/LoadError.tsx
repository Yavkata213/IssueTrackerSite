import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface LoadErrorProps {
  message: string;
  onRetry: () => void;
}

/** Shown when a page or the app could not load its data. */
export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <Box
      role="alert"
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 6, textAlign: 'center' }}
    >
      <Typography>{message}</Typography>
      <Button variant="outlined" onClick={onRetry}>
        Try again
      </Button>
    </Box>
  );
}
