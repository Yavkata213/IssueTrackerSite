import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { paths } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { PageLayout } from '../../layout/PageLayout';

/** Shown for every URL the app has no page for. */
export function NotFoundPage() {
  const { workspace } = useWorkspace();
  return (
    <PageLayout breadcrumbs={[{ label: workspace.name }, { label: 'Page not found' }]}>
      <Typography variant="h1" sx={{ pt: '34px' }}>
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This page does not exist.
      </Typography>
      <Button component={Link} to={paths.home} variant="outlined" sx={{ mt: 2, alignSelf: 'flex-start' }}>
        Go to home
      </Button>
    </PageLayout>
  );
}
