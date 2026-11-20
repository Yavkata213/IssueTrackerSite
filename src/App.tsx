import { Navigate, Route, Routes } from 'react-router-dom';
import { paths, routePatterns } from './app/paths';
import { useWorkspace } from './app/workspaceContext';
import { IssuePage } from './features/issue/IssuePage';
import { NotFoundPage } from './features/not-found/NotFoundPage';
import { PlaceholderPage } from './features/placeholder/PlaceholderPage';
import { SectionIssuesPage } from './features/section-issues/SectionIssuesPage';
import { SectionSettingsPage } from './features/section-settings/SectionSettingsPage';
import { WorkspaceSettingsPage } from './features/workspace-settings/WorkspaceSettingsPage';
import { AppShell } from './layout/AppShell';

/** Opens the first pinned section (or the first section) of the workspace. */
function HomeRedirect() {
  const { sections, sectionsReady } = useWorkspace();
  if (!sectionsReady) return null;
  const target = sections.find((s) => s.pinned) ?? sections[0];
  if (!target) return <PlaceholderPage title="No sections yet" />;
  return <Navigate to={paths.section(target.key)} replace />;
}

// Login and route guards are added here, around AppShell, once the backend has JWT auth.
function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomeRedirect />} />
        <Route path={routePatterns.section} element={<SectionIssuesPage />} />
        <Route path={routePatterns.issue} element={<IssuePage />} />
        <Route path={routePatterns.sectionSettings} element={<SectionSettingsPage />} />
        <Route path={paths.inbox} element={<PlaceholderPage title="Inbox" />} />
        <Route path={paths.assigned} element={<PlaceholderPage title="Assigned to me" />} />
        <Route path={paths.presets} element={<PlaceholderPage title="Presets" />} />
        <Route path={paths.auditLog} element={<PlaceholderPage title="Audit log" />} />
        <Route path={paths.workspaceSettings} element={<WorkspaceSettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
