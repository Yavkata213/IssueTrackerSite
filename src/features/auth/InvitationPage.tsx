import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  acceptInvitation,
  acceptInvitationAsCurrentUser,
  ApiError,
  getErrorMessage,
  getInvitationPreview,
} from '../../api';
import { useAuth } from '../../app/authContext';
import { paths } from '../../app/paths';
import { WorkspaceLogo } from '../../components/common';
import type { InvitationPreview } from '../../types';
import { checkPassword, normalizeEmail } from '../../utils/accounts';
import { LIMITS } from '../../utils/limits';
import { AuthLayout } from '../../components/common';
import { PasswordField } from './PasswordField';

/** The page behind the link in an invitation email. */
export function InvitationPage() {
  const { token = '' } = useParams();
  const [preview, setPreview] = useState<InvitationPreview | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getInvitationPreview(token)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (preview === undefined) return <AuthLayout title="Invitation">{null}</AuthLayout>;
  if (preview === null) {
    return (
      <AuthLayout title="This invitation does not work">
        <Alert severity="warning">The link has expired, was already used or was withdrawn. Ask the person who invited you for a new one.</Alert>
        <Button component={RouterLink} to={paths.signIn} variant="outlined" fullWidth sx={{ mt: 2 }}>
          Go to sign in
        </Button>
      </AuthLayout>
    );
  }
  return <InvitationContent token={token} preview={preview} />;
}

function Summary({ preview }: { preview: InvitationPreview }) {
  return (
    <Box sx={{ mb: 3, p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'surface.field', borderRadius: 1 }}>
      <WorkspaceLogo workspace={{ name: preview.workspaceName, logoUrl: preview.workspaceLogoUrl }} size={48} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
          {preview.workspaceName}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Role: {preview.roleName}
          {preview.invitedByName ? ` · invited by ${preview.invitedByName}` : ''}
        </Typography>
      </Box>
    </Box>
  );
}

function InvitationContent({ token, preview }: { token: string; preview: InvitationPreview }) {
  const { status, user, signIn, signOut, startSession } = useAuth();
  const navigate = useNavigate();
  const title = `Join ${preview.workspaceName}`;

  // ---- Signed in: join with this account, if it is the invited one.
  if (status === 'signedIn' && user) {
    if (normalizeEmail(user.email) !== normalizeEmail(preview.email)) {
      return (
        <AuthLayout title={title}>
          <Summary preview={preview} />
          <Alert severity="warning">
            This invitation was sent to {preview.email}, but you are signed in as {user.email}.
          </Alert>
          <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={() => void signOut()}>
            Sign out and continue
          </Button>
        </AuthLayout>
      );
    }
    return <JoinWithAccount token={token} preview={preview} title={title} onJoined={(workspaceId) => navigate(paths.home, { replace: true, state: { workspaceId } })} />;
  }

  // ---- Signed out: sign in (account exists) or choose a password (new account).
  if (preview.accountExists) {
    return (
      <AuthLayout title={title} subtitle="Sign in to accept the invitation.">
        <Summary preview={preview} />
        <SignInStep email={preview.email} onSignIn={(password) => signIn(preview.email, password)} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={title} subtitle="Create your account to accept the invitation.">
      <Summary preview={preview} />
      <CreateAccountStep
        token={token}
        email={preview.email}
        onCreated={(created) => {
          startSession(created);
          navigate(paths.home, { replace: true });
        }}
      />
    </AuthLayout>
  );
}

function SignInStep({ email, onSignIn }: { email: string; onSignIn: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || password === '') return;
    setBusy(true);
    setError(null);
    onSignIn(password).catch((failure: unknown) => {
      setError(getErrorMessage(failure));
      setPassword('');
      setBusy(false);
    });
  };

  return (
    <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      <TextField label="Email" value={email} disabled fullWidth slotProps={{ htmlInput: { autoComplete: 'username' } }} />
      <PasswordField label="Password" autoComplete="current-password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ height: 44, fontWeight: 500 }}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </Box>
  );
}

function CreateAccountStep({ token, email, onCreated }: { token: string; email: string; onCreated: (user: Awaited<ReturnType<typeof acceptInvitation>>) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<{ displayName?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (displayName.trim() === '') next.displayName = 'Enter your name.';
    const problem = checkPassword(password, { email, name: displayName });
    if (problem) next.password = problem;
    else if (password !== again) next.password = 'The two passwords are not the same.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    acceptInvitation(token, { displayName, password })
      .then(onCreated)
      .catch((failure: unknown) => {
        if (failure instanceof ApiError && (failure.field === 'displayName' || failure.field === 'password')) {
          setErrors({ [failure.field]: failure.message });
        } else {
          setErrors({ form: getErrorMessage(failure) });
        }
        setBusy(false);
      });
  };

  return (
    <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {errors.form && (
        <Alert severity="error" role="alert">
          {errors.form}
        </Alert>
      )}
      <TextField label="Email" value={email} disabled fullWidth slotProps={{ htmlInput: { autoComplete: 'username' } }} />
      <TextField
        label="Your name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={errors.displayName !== undefined}
        helperText={errors.displayName}
        fullWidth
        autoFocus
        slotProps={{ htmlInput: { autoComplete: 'name', maxLength: LIMITS.userName } }}
      />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password !== undefined}
        helperText={errors.password ?? `At least ${LIMITS.passwordMin} characters.`}
      />
      <PasswordField label="Repeat the password" autoComplete="new-password" value={again} onChange={(event) => setAgain(event.target.value)} />
      <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ height: 44, fontWeight: 500 }}>
        {busy ? 'Creating your account…' : 'Create account and join'}
      </Button>
    </Box>
  );
}

function JoinWithAccount({ token, preview, title, onJoined }: { token: string; preview: InvitationPreview; title: string; onJoined: (workspaceId: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    acceptInvitationAsCurrentUser(token)
      .then((result) => onJoined(result.workspaceId))
      .catch((failure: unknown) => {
        setError(getErrorMessage(failure));
        setBusy(false);
      });
  };

  return (
    <AuthLayout title={title} subtitle="You are signed in with the invited account.">
      <Summary preview={preview} />
      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Button variant="contained" size="large" fullWidth disabled={busy} onClick={join} sx={{ height: 44, fontWeight: 500 }}>
        {busy ? 'Joining…' : `Join ${preview.workspaceName}`}
      </Button>
    </AuthLayout>
  );
}
