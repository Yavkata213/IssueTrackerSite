import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { Link as RouterLink } from 'react-router-dom';
import { devLinkPath } from '../../../utils/devLink';
import type { InvitationSent } from '../../../types';

interface InvitationLinkDialogProps {
  sent: InvitationSent | null;
  onClose: () => void;
}

/**
 * Development only. The mock backend has no mailbox, so the invitation link is shown here. "Open
 * the link" follows it inside the app, because a new tab would reload the page and erase the mock
 * data. The real backend emails the link and never returns it to the admin: whoever holds the
 * link can accept the invitation.
 */
export function InvitationLinkDialog({ sent, onClose }: InvitationLinkDialogProps) {
  const link = import.meta.env.DEV ? sent?.devLink : null;
  const path = devLinkPath(link);
  return (
    <Dialog open={Boolean(link)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invitation link (development only)</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          The mock backend cannot send email. In production this link is emailed to {sent?.invitation.email} and never shown here.
          Use "Open the link" below: opening the address in a new tab reloads the page and erases the mock data.
        </Alert>
        <TextField
          value={link ?? ''}
          fullWidth
          multiline
          slotProps={{ input: { readOnly: true }, htmlInput: { 'aria-label': 'Invitation link' } }}
          onFocus={(event) => event.target.select()}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => void navigator.clipboard.writeText(link ?? '')}>Copy</Button>
        <Button onClick={onClose}>Done</Button>
        {path && (
          <Button component={RouterLink} to={path} variant="contained" onClick={onClose}>
            Open the link
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
