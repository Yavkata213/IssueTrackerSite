import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { ApiError, getErrorMessage, resendVerificationEmail, signUp } from '../../api';
import { useAuth } from '../../app/authContext';
import { paths } from '../../app/paths';
import { AuthLayout } from '../../components/common';
import { checkPassword, isValidEmail } from '../../utils/accounts';
import { LIMITS } from '../../utils/limits';
import { PasswordField } from './PasswordField';

type FieldErrors = Partial<Record<'displayName' | 'email' | 'password', string>>;

export function SignUpPage() {
  const { status } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ devLink: string | null } | null>(null);
  const [resent, setResent] = useState(false);

  if (status === 'signedIn') return <Navigate to={paths.home} replace />;

  const signInLink = (
    <>
      Already have an account?{' '}
      <Link component={RouterLink} to={paths.signIn} underline="hover">
        Sign in
      </Link>
    </>
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: FieldErrors = {};
    if (displayName.trim() === '') next.displayName = 'Enter your name.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    const problem = checkPassword(password, { email, name: displayName });
    if (problem) next.password = problem;
    else if (password !== again) next.password = 'The two passwords are not the same.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    signUp({ displayName, email, password })
      .then(setSent)
      .catch((failure: unknown) => {
        if (failure instanceof ApiError && (failure.field === 'displayName' || failure.field === 'email' || failure.field === 'password')) {
          setErrors({ [failure.field]: failure.message });
        } else {
          setFormError(getErrorMessage(failure));
        }
      })
      .finally(() => setBusy(false));
  };

  const sendAgain = () => {
    resendVerificationEmail(email)
      .then((result) => {
        setSent(result);
        setResent(true);
      })
      .catch((failure: unknown) => setFormError(getErrorMessage(failure)));
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" footer={signInLink}>
        <Alert severity="info">
          We sent a message to {email.trim()}. Open the link in it to confirm your address, then sign in. The link works for 24 hours.
          If you already have an account with this address, the message says so.
        </Alert>
        {resent && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Sent again.
          </Alert>
        )}
        {formError && (
          <Alert severity="error" role="alert" sx={{ mt: 2 }}>
            {formError}
          </Alert>
        )}
        {/* The mock backend has no mailbox: in development the link is shown here. The real backend only emails it. */}
        {import.meta.env.DEV && sent.devLink && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Development only:{' '}
            <Link href={sent.devLink} underline="hover">
              open the confirmation link
            </Link>
          </Alert>
        )}
        <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={sendAgain}>
          Send the email again
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="You confirm your email address first. After that you can create a workspace or join one you were invited to." footer={signInLink}>
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {formError && (
          <Alert severity="error" role="alert">
            {formError}
          </Alert>
        )}
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
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email !== undefined}
          helperText={errors.email}
          fullWidth
          slotProps={{ htmlInput: { autoComplete: 'username', maxLength: LIMITS.email, inputMode: 'email' } }}
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
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
      </Box>
    </AuthLayout>
  );
}
