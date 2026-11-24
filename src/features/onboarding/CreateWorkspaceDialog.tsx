import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, createWorkspace, getErrorMessage } from '../../api';
import { LIMITS } from '../../utils/limits';
import {
  isValidWorkspaceSlug,
  normalizeWorkspaceSlugInput,
  slugFromName,
  WORKSPACE_URL_SUFFIX,
} from '../../utils/workspaceSlug';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the id of the new workspace. */
  onCreated: (workspaceId: string) => void;
}

/** Name and URL of a new workspace. The person who creates it becomes its Owner. */
export function CreateWorkspaceDialog({ open, onClose, onCreated }: CreateWorkspaceDialogProps) {
  // Mounted only while open, so every opening starts with an empty form.
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <CreateWorkspaceForm onClose={onClose} onCreated={onCreated} />
    </Dialog>
  );
}

function CreateWorkspaceForm({ onClose, onCreated }: Omit<CreateWorkspaceDialogProps, 'open'>) {
  const titleId = useId();
  const [name, setName] = useState('');
  // The URL follows the name until the person edits it themself.
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'slug', string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slug = customSlug ?? slugFromName(name);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (name.trim() === '') next.name = 'Enter a name for the workspace.';
    if (!isValidWorkspaceSlug(slug)) {
      next.slug = `Use ${LIMITS.workspaceSlugMin}–${LIMITS.workspaceSlugMax} lowercase letters, digits and hyphens.`;
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    createWorkspace({ name, slug })
      .then((workspace) => onCreated(workspace.id))
      .catch((failure: unknown) => {
        if (failure instanceof ApiError && (failure.field === 'name' || failure.field === 'slug')) {
          setErrors({ [failure.field]: failure.message });
        } else {
          setFormError(getErrorMessage(failure));
        }
        setBusy(false);
      });
  };

  return (
    <form onSubmit={submit} noValidate aria-labelledby={titleId}>
      <DialogTitle id={titleId}>Create a workspace</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          A workspace is where your team keeps its sections and issues. You become its owner and can invite people afterwards.
        </DialogContentText>
        {formError && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}
        <TextField
          label="Workspace name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name !== undefined}
          helperText={errors.name}
          fullWidth
          autoFocus
          margin="dense"
          slotProps={{ htmlInput: { maxLength: LIMITS.workspaceName } }}
        />
        <TextField
          label="Workspace URL"
          value={slug}
          onChange={(event) => setCustomSlug(normalizeWorkspaceSlugInput(event.target.value))}
          error={errors.slug !== undefined}
          helperText={errors.slug}
          fullWidth
          margin="dense"
          slotProps={{
            htmlInput: { maxLength: LIMITS.workspaceSlugMax, spellCheck: false, autoCapitalize: 'none' },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color="text.secondary">
                    {WORKSPACE_URL_SUFFIX}
                  </Typography>
                </InputAdornment>
              ),
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Creating…' : 'Create workspace'}
        </Button>
      </DialogActions>
    </form>
  );
}
