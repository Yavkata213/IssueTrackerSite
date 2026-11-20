import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getErrorMessage, getSectionBoard, moveIssue, reorderStatuses } from '../../api';
import { paths } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { ErrorToast, LoadError } from '../../components/common';
import { PageLayout } from '../../layout/PageLayout';
import type { IssueDetailData, SectionBoardData } from '../../types';
import { isOverdue } from '../../utils/dates';
import { hasPermission, PERMISSION } from '../../utils/permissions';
import { isValidSectionKey } from '../../utils/sectionKey';
import { IssuePanel } from '../issue/IssuePanel';
import { BoardView } from './board/BoardView';
import { EMPTY_FILTERS, filterIssues, formatIssueId } from './filters';
import type { IssueFilterState } from './filters';
import { IssueToolbar } from './IssueToolbar';
import type { GroupBy, IssueView } from './IssueToolbar';
import { TableView } from './table/TableView';

const ISSUE_KEY = /^[A-Za-z]{2,5}-\d{1,9}$/;

function parseView(value: string | null): IssueView {
  return value === 'table' ? 'table' : 'board';
}

/** Route entry. Remounts the content when the section or workspace changes. */
export function SectionIssuesPage() {
  const { key = '' } = useParams();
  const { workspace } = useWorkspace();
  return <SectionIssuesContent key={`${workspace.id}:${key}`} sectionKey={key} />;
}

function SectionIssuesContent({ sectionKey }: { sectionKey: string }) {
  const { workspace, currentUser } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseView(searchParams.get('view'));

  // The key comes from the URL: check its shape before it is used for anything.
  const keyIsValid = isValidSectionKey(sectionKey);

  const [data, setData] = useState<SectionBoardData | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<IssueFilterState>(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>('status');

  useEffect(() => {
    let cancelled = false;
    if (keyIsValid) {
      getSectionBoard(workspace.id, sectionKey)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((error: unknown) => {
          if (!cancelled) setLoadError(getErrorMessage(error));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [workspace.id, sectionKey, keyIsValid, attempt]);

  const retry = () => {
    setLoadError(null);
    setAttempt((value) => value + 1);
  };

  const sectionId = data?.section.id;

  // The issue panel: `?issue=IT-142`. Only an issue of this section is opened.
  const issueParam = searchParams.get('issue');
  const openIssueKey =
    issueParam !== null && ISSUE_KEY.test(issueParam) && issueParam.split('-')[0].toUpperCase() === sectionKey.toUpperCase()
      ? issueParam.toUpperCase()
      : null;
  // The panel keeps showing the last issue while it slides out.
  const [panelKey, setPanelKey] = useState(openIssueKey);
  if (openIssueKey !== null && openIssueKey !== panelKey) setPanelKey(openIssueKey);

  const openIssue = (issueId: string) => {
    const issue = data?.issues.find((i) => i.id === issueId);
    if (!data || !issue) return;
    const next = new URLSearchParams(searchParams);
    next.set('issue', formatIssueId(data.section.key, issue.number));
    setSearchParams(next);
  };
  const closeIssue = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('issue');
    setSearchParams(next, { replace: true });
  };

  /** The panel changed an issue: the board shows what the server now has. */
  const handleIssueChanged = useCallback((detail: IssueDetailData) => {
    setData((prev) => {
      if (!prev) return prev;
      const known = new Set(prev.members.map((u) => u.id));
      return {
        ...prev,
        issues: prev.issues.map((issue) =>
          issue.id === detail.issue.id
            ? { ...detail.issue, categoryIds: detail.categoryIds, assigneeIds: detail.assigneeIds }
            : issue,
        ),
        members: [...prev.members, ...detail.assignableUsers.filter((u) => !known.has(u.id))],
      };
    });
  }, []);

  /** A write failed: put the board back as it was and sync with the server. */
  const rollBack = useCallback(
    (snapshot: SectionBoardData | null | undefined, error: unknown) => {
      setNotice(getErrorMessage(error));
      if (snapshot) setData(snapshot);
      getSectionBoard(workspace.id, sectionKey)
        .then((fresh) => {
          if (fresh) setData(fresh);
        })
        .catch(() => undefined);
    },
    [workspace.id, sectionKey],
  );

  const handleMoveIssue = useCallback(
    (issueId: string, statusId: string, boardPosition: number) => {
      if (!sectionId) return;
      const snapshot = data;
      setData((prev) =>
        prev
          ? {
              ...prev,
              issues: prev.issues.map((issue) =>
                issue.id === issueId ? { ...issue, statusId, boardPosition } : issue,
              ),
            }
          : prev,
      );
      moveIssue(workspace.id, sectionId, issueId, { statusId, boardPosition }).catch((error: unknown) =>
        rollBack(snapshot, error),
      );
    },
    [workspace.id, sectionId, data, rollBack],
  );

  const handleReorderStatuses = useCallback(
    (orderedStatusIds: string[]) => {
      if (!sectionId) return;
      const snapshot = data;
      setData((prev) => {
        if (!prev) return prev;
        const statuses = orderedStatusIds.flatMap((id, position) => {
          const status = prev.statuses.find((s) => s.id === id);
          return status ? [{ ...status, position }] : [];
        });
        return { ...prev, statuses };
      });
      reorderStatuses(workspace.id, sectionId, orderedStatusIds).catch((error: unknown) =>
        rollBack(snapshot, error),
      );
    },
    [workspace.id, sectionId, data, rollBack],
  );

  const maps = useMemo(
    () => ({
      categoriesById: new Map((data?.categories ?? []).map((c) => [c.id, c])),
      usersById: new Map((data?.members ?? []).map((u) => [u.id, u])),
    }),
    [data],
  );

  const visibleIssues = useMemo(
    () => (data ? filterIssues(data.issues, filters, data.section.key, currentUser.id) : []),
    [data, filters, currentUser.id],
  );
  const overdueCount = useMemo(() => (data ? data.issues.filter((i) => isOverdue(i)).length : 0), [data]);

  const setView = (next: IssueView) => {
    setSearchParams(next === 'board' ? {} : { view: next }, { replace: true });
  };

  if (!keyIsValid || data === null) {
    return (
      <PageLayout breadcrumbs={[{ label: workspace.name }, { label: 'Section not found' }]}>
        <Typography variant="h1" sx={{ pt: '34px' }}>
          Section not found
        </Typography>
        <Typography color="text.secondary">There is no section with the key “{sectionKey}” in this workspace.</Typography>
      </PageLayout>
    );
  }
  if (loadError) {
    return (
      <PageLayout breadcrumbs={[{ label: workspace.name }]}>
        <LoadError message={loadError} onRetry={retry} />
      </PageLayout>
    );
  }
  if (data === undefined) {
    return <PageLayout breadcrumbs={[{ label: workspace.name }]}>{null}</PageLayout>;
  }

  // Opened with an old key (after a key change): go to the current address, keeping `?view=`.
  if (data.section.key !== sectionKey.toUpperCase()) {
    const search = searchParams.toString();
    return <Navigate to={`${paths.section(data.section.key)}${search ? `?${search}` : ''}`} replace />;
  }

  const { section, permissions } = data;
  const viewLabel = view === 'board' ? 'Board' : 'Table';

  return (
    <PageLayout breadcrumbs={[{ label: workspace.name }, { label: section.name }, { label: viewLabel }]}>
      <Box sx={{ pt: '34px', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h1" component="h1">
            {section.name}
          </Typography>
          {hasPermission(permissions, PERMISSION.sectionSettingsEdit) && (
            <IconButton
              component={Link}
              to={paths.sectionSettings(section.key)}
              aria-label="Section settings"
              sx={{ width: 36, height: 36, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
            >
              <SettingsIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}
        </Box>
        {section.description && (
          <Typography variant="body2" color="text.secondary">
            {section.description}
          </Typography>
        )}
        <Box sx={{ mt: '21px' }}>
          <IssueToolbar
            filters={filters}
            onFiltersChange={setFilters}
            overdueCount={overdueCount}
            view={view}
            onViewChange={setView}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', mt: view === 'board' ? 3 : '13px', pb: view === 'board' ? '34px' : 3 }}>
        {view === 'board' ? (
          <BoardView
            sectionKey={section.key}
            statuses={data.statuses}
            issues={visibleIssues}
            categoriesById={maps.categoriesById}
            usersById={maps.usersById}
            canMoveIssues={hasPermission(permissions, PERMISSION.issueMove)}
            canReorderStatuses={hasPermission(permissions, PERMISSION.statusesManage)}
            onMoveIssue={handleMoveIssue}
            onOpenIssue={openIssue}
            onReorderStatuses={handleReorderStatuses}
          />
        ) : (
          <TableView
            sectionKey={section.key}
            statuses={data.statuses}
            issues={visibleIssues}
            categoriesById={maps.categoriesById}
            usersById={maps.usersById}
            onOpenIssue={openIssue}
          />
        )}
      </Box>
      {panelKey && (
        <IssuePanel open={openIssueKey !== null} issueKey={panelKey} onClose={closeIssue} onChanged={handleIssueChanged} />
      )}
      <ErrorToast message={notice} onClose={() => setNotice(null)} />
    </PageLayout>
  );
}
