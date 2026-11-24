import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, checkEmailVerificationLink, verifyEmail } from '../../api';
import { paths } from '../../app/paths';
import { AuthLayout } from '../../components/common';

/**
 * The page behind the link in the sign-up email. The address is confirmed by a button, not by
 * opening the page: mail programs and scanners open links on their own and would use it up.
 */
export function VerifyEmailPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [linkOk, setLinkOk] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkEmailVerificationLink(token)
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

  const toSignIn = (
    <Link component={RouterLink} to={paths.signIn} underline="hover">
      Go to sign in
    </Link>
  );

  if (linkOk === undefined) return <AuthLayout title="Confirm your email">{null}</AuthLayout>;
  if (!linkOk) {
    return (
      <AuthLayout title="This link does not work" footer={toSignIn}>
        <Alert severity="warning">
          The link has expired or was already used. If your email is not confirmed yet, sign in and ask for a new message.
        </Alert>
      </AuthLayout>
    );
  }

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    verifyEmail(token)
      .then(() => navigate(paths.signIn, { replace: true, state: { notice: 'Your email address is confirmed. Sign in to continue.' } }))
      .catch((failure: unknown) => {
        setError(getErrorMessage(failure));
        setBusy(false);
      });
  };

  return (
    <AuthLayout title="Confirm your email" subtitle="One more step: confirm that this address is yours." footer={toSignIn}>
      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Button variant="contained" size="large" fullWidth disabled={busy} onClick={confirm} sx={{ height: 44, fontWeight: 500 }}>
        {busy ? 'Confirming…' : 'Confirm my email'}
      </Button>
    </AuthLayout>
  );
}
