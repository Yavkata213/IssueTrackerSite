import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { ApiError, checkPasswordResetLink, getErrorMessage, resetPassword } from '../../api';
import { paths } from '../../app/paths';
import { checkPassword } from '../../utils/accounts';
import { LIMITS } from '../../utils/limits';
import { AuthLayout } from '../../components/common';
import { PasswordField } from './PasswordField';

export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [linkOk, setLinkOk] = useState<boolean | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkPasswordResetLink(token)
      .then((ok) => {
        if (!cancelled) setLinkOk(ok);
      })
      .catch(() => {
        if (!cancelled) setLinkOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const back = (
    <Link component={RouterLink} to={paths.signIn} underline="hover">
      Back to sign in
    </Link>
  );

  if (linkOk === undefined) return <AuthLayout title="Choose a new password">{null}</AuthLayout>;
  if (!linkOk) {
    return (
      <AuthLayout title="This link does not work" footer={back}>
        <Alert severity="warning">The link has expired or was already used. Ask for a new one.</Alert>
        <Button component={RouterLink} to={paths.forgotPassword} variant="outlined" fullWidth sx={{ mt: 2 }}>
          Send a new link
        </Button>
      </AuthLayout>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = checkPassword(password);
    if (problem) {
      setFieldError(problem);
      return;
    }
    if (password !== again) {
      setFieldError('The two passwords are not the same.');
      return;
    }
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    resetPassword(token, password)
      .then(() => navigate(paths.signIn, { replace: true, state: { notice: 'Your password was changed. Sign in with the new one.' } }))
      .catch((failure: unknown) => {
        if (failure instanceof ApiError && failure.field === 'password') setFieldError(failure.message);
        else setError(getErrorMessage(failure));
        setBusy(false);
      });
  };

  return (
    <AuthLayout title="Choose a new password" subtitle={`Use at least ${LIMITS.passwordMin} characters.`} footer={back}>
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError !== undefined}
          helperText={fieldError}
        />
        <PasswordField label="Repeat the password" autoComplete="new-password" value={again} onChange={(event) => setAgain(event.target.value)} />
        <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ height: 44, fontWeight: 500 }}>
          {busy ? 'Saving…' : 'Change password'}
        </Button>
      </Box>
    </AuthLayout>
  );
}
