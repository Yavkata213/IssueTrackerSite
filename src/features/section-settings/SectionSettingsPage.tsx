import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, getErrorMessage, getSectionSettings } from '../../api';
import { paths } from '../../app/paths';
import type { SettingsTab } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { ErrorToast, LoadError } from '../../components/common';
import { SettingsTabSelect } from '../../components/settings';
import { PageLayout } from '../../layout/PageLayout';
import { thinScrollbar } from '../../theme';
import type { Section, SectionSettingsData } from '../../types';
import { hasPermission, PERMISSION } from '../../utils/permissions';
import { isValidSectionKey } from '../../utils/sectionKey';
import { CategoryTab } from './category/CategoryTab';
import { GeneralTab } from './general/GeneralTab';
import { MembersRolesTab } from './members/MembersRolesTab';
import { SETTINGS_TABS } from './tabs';
import type { PatchSettingsData } from './types';

function parseTab(value: string | null): SettingsTab {
  return value === 'members' || value === 'category' ? value : 'general';
}

/** Route entry. Remounts the content when the section or workspace changes. */
export function SectionSettingsPage() {
  const { key = '' } = useParams();
  const { workspace } = useWorkspace();
  return <SectionSettingsContent key={`${workspace.id}:${key}`} sectionKey={key} />;
}

function MessagePage({ crumbs, title, text }: { crumbs: string[]; title: string; text: string }) {
  return (
    <PageLayout breadcrumbs={crumbs.map((label) => ({ label }))}>
      <Typography variant="h1" sx={{ pt: '34px' }}>
        {title}
      </Typography>
      <Typography color="text.secondary">{text}</Typography>
    </PageLayout>
  );
}

function SectionSettingsContent({ sectionKey }: { sectionKey: string }) {
  const { workspace, reloadSections } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const keyIsValid = isValidSectionKey(sectionKey);

  const [data, setData] = useState<SectionSettingsData | null | undefined>(undefined);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (keyIsValid) {
      getSectionSettings(workspace.id, sectionKey)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          if (error instanceof ApiError && error.code === 'FORBIDDEN') setForbidden(true);
          else setLoadError(getErrorMessage(error));
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

  const patchData: PatchSettingsData = useCallback(
    (update) => setData((prev) => (prev ? update(prev) : prev)),
    [],
  );

  const handleSectionSaved = (section: Section) => {
    patchData((current) => ({ ...current, section }));
    // The sidebar shows name, key and icon. A changed key also changes the URL: the redirect
    // below takes the page to the new address.
    reloadSections();
  };

  if (!keyIsValid || data === null) {
    return (
      <MessagePage
        crumbs={[workspace.name, 'Section not found']}
        title="Section not found"
        text={`There is no section with the key “${sectionKey}” in this workspace.`}
      />
    );
  }
  if (forbidden) {
    return (
      <MessagePage
        crumbs={[workspace.name, 'Settings']}
        title="No access"
        text="You do not have permission to change the settings of this section."
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
  if (data === undefined) {
    return <PageLayout breadcrumbs={[{ label: workspace.name }]}>{null}</PageLayout>;
  }
  // Opened with an old key (or after a key change): go to the current address.
  if (data.section.key !== sectionKey.toUpperCase()) {
    return <Navigate to={paths.sectionSettings(data.section.key, tab)} replace />;
  }

  const { section, permissions } = data;
  const tabInfo = SETTINGS_TABS.find((t) => t.value === tab) ?? SETTINGS_TABS[0];
  const panel = (id: SettingsTab) => ({
    display: tab === id ? 'flex' : 'none',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  });

  return (
    <PageLayout breadcrumbs={[{ label: workspace.name }, { label: section.name }, { label: 'Settings' }]}>
      <Box sx={{ pt: '30px', flexShrink: 0 }}>
        <Typography variant="h1" component="h1">
          {section.name} settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tabInfo.description}
        </Typography>
      </Box>
      <Box sx={{ mt: 4, flexShrink: 0 }}>
        <SettingsTabSelect
          tabs={SETTINGS_TABS}
          value={tab}
          onChange={(next) => setSearchParams(next === 'general' ? {} : { tab: next }, { replace: true })}
        />
      </Box>
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ ...panel('general'), overflowY: 'auto', ...thinScrollbar }}>
          <GeneralTab
            workspaceId={workspace.id}
            section={section}
            canEdit={hasPermission(permissions, PERMISSION.sectionSettingsEdit)}
            onSaved={handleSectionSaved}
            onNotice={setNotice}
          />
        </Box>
        <Box sx={panel('members')}>
          <MembersRolesTab
            workspaceId={workspace.id}
            section={section}
            roles={data.roles}
            catalog={data.permissionCatalog}
            canEdit={hasPermission(permissions, PERMISSION.membersManage)}
            patchData={patchData}
            onNotice={setNotice}
            onMembersChanged={() => setAttempt((value) => value + 1)}
          />
        </Box>
        <Box sx={panel('category')}>
          <CategoryTab
            workspaceId={workspace.id}
            section={section}
            categories={data.categories}
            canEdit={hasPermission(permissions, PERMISSION.categoriesManage)}
            patchData={patchData}
            onNotice={setNotice}
          />
        </Box>
      </Box>
      <ErrorToast message={notice} onClose={() => setNotice(null)} />
    </PageLayout>
  );
}
