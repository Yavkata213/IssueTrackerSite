import { Navigate, Route, Routes } from 'react-router-dom';
import { paths, routePatterns } from './app/paths';
import { useWorkspace } from './app/workspaceContext';
import { RequireAuth } from './app/RequireAuth';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { InvitationPage } from './features/auth/InvitationPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { SignInPage } from './features/auth/SignInPage';
import { SignUpPage } from './features/auth/SignUpPage';
import { VerifyEmailPage } from './features/auth/VerifyEmailPage';
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

// Pages that need no sign-in come first; everything else sits behind `RequireAuth`, the one guard.
function App() {
  return (
    <Routes>
      <Route path={paths.signIn} element={<SignInPage />} />
      <Route path={paths.signUp} element={<SignUpPage />} />
      <Route path={routePatterns.verifyEmail} element={<VerifyEmailPage />} />
      <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={routePatterns.resetPassword} element={<ResetPasswordPage />} />
      <Route path={routePatterns.invitation} element={<InvitationPage />} />
      <Route element={<RequireAuth />}>
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
      </Route>
    </Routes>
  );
}

export default App;
