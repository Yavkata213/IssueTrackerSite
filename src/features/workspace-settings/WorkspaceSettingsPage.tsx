import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ApiError, getErrorMessage, getWorkspaceSettings } from '../../api';
import { paths } from '../../app/paths';
import type { WorkspaceSettingsTab } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { ErrorToast, LoadError } from '../../components/common';
import { SettingsTabSelect } from '../../components/settings';
import { PageLayout } from '../../layout/PageLayout';
import { thinScrollbar } from '../../theme';
import type { Workspace, WorkspaceSettingsData } from '../../types';
import { hasPermission, PERMISSION } from '../../utils/permissions';
import { GeneralTab } from './general/GeneralTab';
import { MembersTab } from './members/MembersTab';
import { RolesTab } from './roles/RolesTab';
import { WORKSPACE_SETTINGS_TABS } from './tabs';
import type { PatchWorkspaceData } from './types';

function parseTab(value: string | null): WorkspaceSettingsTab {
  return value === 'roles' || value === 'members' ? value : 'general';
}

/** Route entry. Remounts the content when the workspace changes. */
export function WorkspaceSettingsPage() {
  const { workspace } = useWorkspace();
  return <WorkspaceSettingsContent key={workspace.id} />;
}

function WorkspaceSettingsContent() {
  const { workspace, reloadWorkspaces } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = parseTab(searchParams.get('tab'));

  const [data, setData] = useState<WorkspaceSettingsData | undefined>(undefined);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWorkspaceSettings(workspace.id)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === 'FORBIDDEN') setForbidden(true);
        else setLoadError(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [workspace.id, attempt]);

  const patchData: PatchWorkspaceData = useCallback(
    (update) => setData((prev) => (prev ? update(prev) : prev)),
    [],
  );

  const handleSaved = (saved: Workspace) => {
    patchData((current) => ({ ...current, workspace: saved }));
    // The sidebar and the breadcrumb show the name and the logo.
    reloadWorkspaces();
  };

  if (forbidden) {
    return (
      <PageLayout breadcrumbs={[{ label: workspace.name }, { label: 'Workspace settings' }]}>
        <Typography variant="h1" sx={{ pt: '34px' }}>
          No access
        </Typography>
        <Typography color="text.secondary">You do not have permission to change the settings of this workspace.</Typography>
      </PageLayout>
    );
  }
  if (loadError) {
    return (
      <PageLayout breadcrumbs={[{ label: workspace.name }, { label: 'Workspace settings' }]}>
        <LoadError
          message={loadError}
          onRetry={() => {
            setLoadError(null);
            setAttempt((value) => value + 1);
          }}
        />
      </PageLayout>
    );
  }
  if (data === undefined) {
    return <PageLayout breadcrumbs={[{ label: workspace.name }, { label: 'Workspace settings' }]}>{null}</PageLayout>;
  }

  const { permissions } = data;
  // Tabs the user may not use are not offered; a URL that asks for one shows General.
  const visibleTabs = WORKSPACE_SETTINGS_TABS.filter((t) => t.permission === null || permissions.includes(t.permission));
  const tab = visibleTabs.some((t) => t.value === requestedTab) ? requestedTab : 'general';
  if (tab !== requestedTab) return <Navigate to={paths.workspaceSettingsTab('general')} replace />;

  const tabInfo = visibleTabs.find((t) => t.value === tab) ?? visibleTabs[0];
  const panel = (id: WorkspaceSettingsTab) => ({
    display: tab === id ? 'flex' : 'none',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  });

  return (
    <PageLayout breadcrumbs={[{ label: data.workspace.name }, { label: 'Workspace settings' }, { label: tabInfo.label }]}>
      <Box sx={{ pt: '30px', flexShrink: 0 }}>
        <Typography variant="h1" component="h1">
          Workspace settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage members, general details and roles for {data.workspace.name}.
        </Typography>
      </Box>
      <Box sx={{ mt: 4, flexShrink: 0 }}>
        <SettingsTabSelect
          tabs={visibleTabs}
          value={tab}
          divider={tab === 'members' ? 'select' : 'full'}
          onChange={(next) => setSearchParams(next === 'general' ? {} : { tab: next }, { replace: true })}
        />
      </Box>
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ ...panel('general'), overflowY: 'auto', ...thinScrollbar }}>
          <GeneralTab
            workspace={data.workspace}
            roles={data.roles}
            canEdit={hasPermission(permissions, PERMISSION.workspaceSettingsEdit)}
            onSaved={handleSaved}
            onNotice={setNotice}
          />
        </Box>
        {visibleTabs.some((t) => t.value === 'roles') && (
          <Box sx={panel('roles')}>
            <RolesTab
              workspace={data.workspace}
              roles={data.roles}
              catalog={data.permissionCatalog}
              canEdit={hasPermission(permissions, PERMISSION.workspaceRolesManage)}
              canAssign={hasPermission(permissions, PERMISSION.workspaceMembersAssignRoles)}
              patchData={patchData}
              onNotice={setNotice}
              onMembersChanged={() => setAttempt((value) => value + 1)}
            />
          </Box>
        )}
        {tab === 'members' && (
          <Box sx={panel('members')}>
            <MembersTab workspaceId={workspace.id} roles={data.roles} sections={data.sections} permissions={permissions} />
          </Box>
        )}
      </Box>
      <ErrorToast message={notice} onClose={() => setNotice(null)} />
    </PageLayout>
  );
}
