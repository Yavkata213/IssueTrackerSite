import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, createInvitation, getErrorMessage } from '../../../api';
import type { InvitationSent, RoleDetail } from '../../../types';
import { isValidEmail } from '../../../utils/accounts';
import { LIMITS } from '../../../utils/limits';

interface AddUserDialogProps {
  open: boolean;
  workspaceId: string;
  /** Workspace roles an invitation may give: everything but the built-in Owner role. */
  roles: RoleDetail[];
  defaultRoleId: string | null;
  onClose: () => void;
  onSent: (sent: InvitationSent) => void;
}

/** "Add user": invites an email address into the workspace with a workspace role. */
export function AddUserDialog({ open, workspaceId, roles, defaultRoleId, onClose, onSent }: AddUserDialogProps) {
  // Mounted only while open, so every opening starts with an empty form.
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <AddUserForm workspaceId={workspaceId} roles={roles} defaultRoleId={defaultRoleId} onClose={onClose} onSent={onSent} />
    </Dialog>
  );
}

function AddUserForm({ workspaceId, roles, defaultRoleId, onClose, onSent }: Omit<AddUserDialogProps, 'open'>) {
  const assignable = roles.filter((role) => !role.isSystem);
  const titleId = useId();
  const roleLabelId = useId();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(assignable.find((r) => r.id === defaultRoleId)?.id ?? assignable[0]?.id ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setEmailError(undefined);
    setError(null);
    createInvitation(workspaceId, { email, roleId })
      .then((sent) => {
        onSent(sent);
        onClose();
      })
      .catch((failure: unknown) => {
        if (failure instanceof ApiError && failure.field === 'email') setEmailError(failure.message);
        else setError(getErrorMessage(failure));
        setBusy(false);
      });
  };

  return (
    <form onSubmit={submit} noValidate aria-labelledby={titleId}>
      <DialogTitle id={titleId}>Add user</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          We email an invitation. The person opens the link, signs in or creates an account, and joins the workspace with this role.
        </DialogContentText>
        {error && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError !== undefined}
          helperText={emailError}
          fullWidth
          autoFocus
          margin="dense"
          slotProps={{ htmlInput: { maxLength: LIMITS.email, inputMode: 'email', autoComplete: 'off' } }}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel id={roleLabelId}>Workspace role</InputLabel>
          <Select labelId={roleLabelId} label="Workspace role" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            {assignable.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || roleId === ''}>
          {busy ? 'Sending…' : 'Send invitation'}
        </Button>
      </DialogActions>
    </form>
  );
}
