import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink, Navigate, useLocation } from 'react-router-dom';
import { ApiError, getErrorMessage, resendVerificationEmail } from '../../api';
import { useAuth } from '../../app/authContext';
import { paths } from '../../app/paths';
import { isValidEmail } from '../../utils/accounts';
import { LIMITS } from '../../utils/limits';
import { safeInternalPath } from '../../utils/redirect';
import { AuthLayout, DevLink } from '../../components/common';
import { PasswordField } from './PasswordField';

interface SignInState {
  /** Page the person asked for before they were sent here. */
  from?: string;
  /** Message from the page before, e.g. after a password reset. */
  notice?: string;
}

export function SignInPage() {
  const { status, signIn } = useAuth();
  const state = useLocation().state as SignInState | null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The password was right but the email address was never confirmed: offer a new message.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState<{ devLink: string | null } | null>(null);

  if (status === 'signedIn') return <Navigate to={safeInternalPath(state?.from)} replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidEmail(email) || password === '') {
      setError('Enter your email address and password.');
      return;
    }
    setBusy(true);
    setError(null);
    setUnconfirmed(false);
    setResent(null);
    signIn(email, password).catch((failure: unknown) => {
      setUnconfirmed(failure instanceof ApiError && failure.field === 'emailNotVerified');
      setError(getErrorMessage(failure));
      setPassword('');
      setBusy(false);
    });
  };

  const sendAgain = () => {
    resendVerificationEmail(email)
      .then(setResent)
      .catch((failure: unknown) => setError(getErrorMessage(failure)));
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the email address your account was created with."
      footer={
        <>
          New here?{' '}
          <Link component={RouterLink} to={paths.signUp} underline="hover">
            Create an account
          </Link>
        </>
      }
    >
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {state?.notice && <Alert severity="success">{state.notice}</Alert>}
        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}
        {unconfirmed && !resent && (
          <Button variant="outlined" onClick={sendAgain}>
            Send the confirmation email again
          </Button>
        )}
        {resent && (
          <Alert severity="success">
            If this account still needs confirming, a new message is on its way.
            <DevLink link={resent.devLink} label="open the confirmation link" />
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
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
          <Link component={RouterLink} to={paths.forgotPassword} variant="body2" underline="hover">
            Forgot password?
          </Link>
        </Box>
        <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ height: 44, fontWeight: 500 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </Box>
    </AuthLayout>
  );
}
