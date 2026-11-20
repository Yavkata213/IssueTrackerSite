import Typography from '@mui/material/Typography';
import { useWorkspace } from '../../app/workspaceContext';
import { PageLayout } from '../../layout/PageLayout';

interface PlaceholderPageProps {
  title: string;
}

/** Stand-in for pages that are not built yet, so sidebar links have a target. */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { workspace } = useWorkspace();
  return (
    <PageLayout breadcrumbs={[{ label: workspace.name }, { label: title }]}>
      <Typography variant="h1" sx={{ pt: '34px' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This page is not built yet.
      </Typography>
    </PageLayout>
  );
}
