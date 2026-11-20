import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { paths } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { ErrorToast, LoadError } from '../../components/common';
import { PageLayout } from '../../layout/PageLayout';
import { thinScrollbar } from '../../theme';
import type { IssueDetailData } from '../../types';
import { formatLongDate, formatTimeAgo } from '../../utils/dates';
import { hasPermission, PERMISSION } from '../../utils/permissions';
import { formatIssueId } from '../section-issues/filters';
import { ActivityList } from './parts/ActivityList';
import { CommentsSection } from './parts/CommentsSection';
import { CompleteButton } from './parts/CompleteButton';
import { DescriptionCard } from './parts/DescriptionCard';
import { FieldsColumn } from './parts/FieldsColumn';
import { TitleInput } from './parts/TitleInput';
import { useIssueDetail } from './useIssueDetail';
import type { IssueActions } from './useIssueDetail';

/** Route entry. Remounts the content when the workspace or the issue changes. */
export function IssuePage() {
  const { issueKey = '' } = useParams();
  const { workspace } = useWorkspace();
  return <IssuePageContent key={`${workspace.id}:${issueKey}`} issueKey={issueKey} />;
}

function Message({ crumbs, title, text }: { crumbs: string[]; title: string; text: string }) {
  return (
    <PageLayout breadcrumbs={crumbs.map((label) => ({ label }))}>
      <Typography variant="h1" sx={{ pt: '34px' }}>
        {title}
      </Typography>
      <Typography color="text.secondary">{text}</Typography>
    </PageLayout>
  );
}

function IssuePageContent({ issueKey }: { issueKey: string }) {
  const { workspace, currentUser } = useWorkspace();
  const { data, loadError, retry, notice, setNotice, actions } = useIssueDetail(workspace.id, issueKey);
  const [copied, setCopied] = useState<string | null>(null);

  if (data === null) {
    return (
      <Message
        crumbs={[workspace.name, 'Issue not found']}
        title="Issue not found"
        text={`There is no issue “${issueKey}” in this workspace.`}
      />
    );
  }
  if (loadError) {
    return (
      <PageLayout breadcrumbs={[{ label: workspace.name }]}>
        <LoadError message={loadError} onRetry={retry} />
      </PageLayout>
    );
  }
  if (data === undefined) return <PageLayout breadcrumbs={[{ label: workspace.name }]}>{null}</PageLayout>;

  const { issue, section } = data;
  const id = formatIssueId(section.key, issue.number);
  // Opened with an old section key: go to the current address.
  if (id !== issueKey.toUpperCase()) return <Navigate to={paths.issue(id)} replace />;

  const canEdit = hasPermission(data.permissions, PERMISSION.issueEdit);
  const canMove = hasPermission(data.permissions, PERMISSION.issueMove);

  const copyLink = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}${paths.issue(id)}`)
      .then(() => setCopied('Link copied'))
      .catch(() => setNotice('The link could not be copied.'));
  };

  return (
    <PageLayout breadcrumbs={[{ label: workspace.name }, { label: section.name }, { label: id }]}>
      <Box sx={{ pt: '30px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <IconButton component={Link} to={paths.section(section.key)} aria-label={`Back to ${section.name}`} sx={{ mt: '-2px' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
            <Typography variant="h1" component="h1">
              {id}
            </Typography>
            <Button onClick={copyLink} sx={{ minWidth: 0, p: 0, fontWeight: 400 }}>
              Copy link
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: '2px' }}>
            Opened by {data.createdBy?.displayName ?? 'a deleted user'} on {formatLongDate(issue.createdAt)} · Updated{' '}
            {formatTimeAgo(issue.updatedAt).toLowerCase()}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, mt: '31px', ml: -4, mr: -4, pl: 4, pr: '24px', overflowY: 'auto', ...thinScrollbar }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 3, alignItems: 'start', pb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <DescriptionCard
              key={issue.id}
              detail={data}
              size="page"
              header={
                <Box sx={{ minHeight: 91, px: 4, display: 'flex', alignItems: 'center', gap: 3, borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TitleInput value={issue.title} editable={canEdit} fontSize={28} onSave={(title) => actions.patch({ title })} />
                  </Box>
                  <CompleteButton completed={issue.completedAt !== null} disabled={!canMove} onClick={actions.toggleComplete} />
                </Box>
              }
              onSaveDescription={(description) => actions.patch({ description })}
              onUpload={actions.upload}
              onRemoveAttachment={actions.removeAttachment}
              onNotice={setNotice}
            />
            <Box sx={{ p: 4, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <CommentsSection
                comments={data.comments}
                currentUser={currentUser}
                canComment={hasPermission(data.permissions, PERMISSION.issueComment)}
                onAdd={actions.addComment}
                textSize={16}
              />
            </Box>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <DetailsCard data={data} patch={actions.patch} />
            <Box sx={{ mt: '22px', px: '3px' }}>
              <ActivityList entries={data.activity} />
            </Box>
          </Box>
        </Box>
      </Box>
      <ErrorToast message={notice} onClose={() => setNotice(null)} />
      <ErrorToast message={copied} severity="success" onClose={() => setCopied(null)} />
    </PageLayout>
  );
}

function DetailsCard({ data, patch }: { data: IssueDetailData; patch: IssueActions['patch'] }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ height: 57, px: 3, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: 18, lineHeight: '26px', fontWeight: 400 }}>
          Details
        </Typography>
      </Box>
      <Box sx={{ pl: '23px', pr: '22px', pt: '20px', pb: '36px' }}>
        <FieldsColumn detail={data} patch={patch} />
      </Box>
    </Box>
  );
}
