import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import { devLinkPath } from '../../utils/devLink';

interface DevLinkProps {
  /** The link the mock backend returned (the real backend only emails it). */
  link: string | null | undefined;
  label: string;
}

/**
 * Development only. The mock backend has no mailbox, so the link of an email is shown here. It is
 * followed inside the app (no page reload), because a reload would erase the mock data in memory.
 */
export function DevLink({ link, label }: DevLinkProps) {
  const path = devLinkPath(link);
  if (!import.meta.env.DEV || !path) return null;
  return (
    <Alert severity="warning" sx={{ mt: 2 }}>
      Development only:{' '}
      <Link component={RouterLink} to={path} underline="hover">
        {label}
      </Link>
    </Alert>
  );
}
