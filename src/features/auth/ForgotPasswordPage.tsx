import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getErrorMessage, requestPasswordReset } from '../../api';
import { paths } from '../../app/paths';
import { isValidEmail } from '../../utils/accounts';
import { LIMITS } from '../../utils/limits';
import { AuthLayout, DevLink } from '../../components/common';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ devLink: string | null } | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    requestPasswordReset(email)
      .then(setSent)
      .catch((failure: unknown) => setError(getErrorMessage(failure)))
      .finally(() => setBusy(false));
  };

  const back = (
    <Link component={RouterLink} to={paths.signIn} underline="hover">
      Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthLayout title="Check your email" footer={back}>
        <Alert severity="info">
          If there is an account for {email.trim()}, a link to choose a new password is on its way. It works for one hour.
        </Alert>
        <DevLink link={sent.devLink} label="open the reset link" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email address and we send you a link to choose a new one." footer={back}>
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          fullWidth
          autoFocus
          slotProps={{ htmlInput: { autoComplete: 'username', maxLength: LIMITS.email, inputMode: 'email' } }}
        />
        <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ height: 44, fontWeight: 500 }}>
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </Box>
    </AuthLayout>
  );
}
