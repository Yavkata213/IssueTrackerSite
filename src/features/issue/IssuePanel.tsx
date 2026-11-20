import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { paths } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { ErrorToast, LoadError, SidePanel } from '../../components/common';
import { thinScrollbar } from '../../theme';
import type { IssueDetailData } from '../../types';
import { formatTimeAgo } from '../../utils/dates';
import { hasPermission, PERMISSION } from '../../utils/permissions';
import { formatIssueId } from '../section-issues/filters';
import { ActivityList } from './parts/ActivityList';
import { CommentsSection } from './parts/CommentsSection';
import { CompleteButton } from './parts/CompleteButton';
import { DescriptionCard } from './parts/DescriptionCard';
import { FieldsColumn } from './parts/FieldsColumn';
import { TitleInput } from './parts/TitleInput';
import { useIssueDetail } from './useIssueDetail';

interface IssuePanelProps {
  open: boolean;
  /** `IT-142`. */
  issueKey: string;
  onClose: () => void;
  /** What the server now has, so the board behind the panel stays in step. */
  onChanged: (detail: IssueDetailData) => void;
}

/** The issue in a side panel over the board or table. The same parts as the full page. */
export function IssuePanel({ open, issueKey, onClose, onChanged }: IssuePanelProps) {
  const { workspace } = useWorkspace();
  return (
    <SidePanel open={open} onClose={onClose} width={1120} label={`Issue ${issueKey}`}>
      <PanelContent key={`${workspace.id}:${issueKey}`} issueKey={issueKey} onClose={onClose} onChanged={onChanged} />
    </SidePanel>
  );
}

function PanelContent({ issueKey, onClose, onChanged }: Omit<IssuePanelProps, 'open'>) {
  const { workspace, currentUser } = useWorkspace();
  const { data, loadError, retry, notice, setNotice, actions } = useIssueDetail(workspace.id, issueKey, onChanged);

  const closeButton = (
    <IconButton aria-label="Close panel" onClick={onClose} sx={{ position: 'absolute', top: 17, right: 22 }}>
      <CloseIcon />
    </IconButton>
  );

  if (data === undefined || data === null || loadError) {
    return (
      <Box sx={{ p: 5 }}>
        {closeButton}
        {loadError ? (
          <LoadError message={loadError} onRetry={retry} />
        ) : (
          <Typography color="text.secondary">{data === null ? `There is no issue “${issueKey}” in this workspace.` : 'Loading…'}</Typography>
        )}
      </Box>
    );
  }

  const { issue, section } = data;
  const id = formatIssueId(section.key, issue.number);
  const canEdit = hasPermission(data.permissions, PERMISSION.issueEdit);
  const canMove = hasPermission(data.permissions, PERMISSION.issueMove);

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', ...thinScrollbar }}>
      {closeButton}
      <Box sx={{ pl: '40px', pr: '60px', pt: '24px', pb: 6, display: 'grid', gridTemplateColumns: 'minmax(0, 680px) 292px', columnGap: '48px', alignItems: 'start' }}>
        <Box sx={{ minWidth: 0 }}>
          <TitleInput value={issue.title} editable={canEdit} fontSize={26} onSave={(title) => actions.patch({ title })} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: '9px' }}>
            {id} · Opened by {data.createdBy?.displayName ?? 'a deleted user'} {formatTimeAgo(issue.createdAt).toLowerCase()}
          </Typography>
          <Box sx={{ mt: '39px' }}>
            <DescriptionCard
              key={issue.id}
              detail={data}
              size="panel"
              onSaveDescription={(description) => actions.patch({ description })}
              onUpload={actions.upload}
              onRemoveAttachment={actions.removeAttachment}
              onNotice={setNotice}
            />
          </Box>
          <Box sx={{ mt: '35px' }}>
            <CommentsSection
              comments={data.comments}
              currentUser={currentUser}
              canComment={hasPermission(data.permissions, PERMISSION.issueComment)}
              onAdd={actions.addComment}
              textSize={14}
            />
          </Box>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ height: 32, mt: '1px', mb: '8px', pr: '25px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
            <CompleteButton completed={issue.completedAt !== null} disabled={!canMove} onClick={actions.toggleComplete} />
            <Button component={Link} to={paths.issue(id)} sx={{ minWidth: 0, p: 0, whiteSpace: 'nowrap', fontWeight: 400 }}>
              Open full page
            </Button>
          </Box>
          <FieldsColumn detail={data} patch={actions.patch} />
          <Box sx={{ mt: '27px' }}>
            <ActivityList entries={data.activity} />
          </Box>
        </Box>
      </Box>
      <ErrorToast message={notice} onClose={() => setNotice(null)} />
    </Box>
  );
}
