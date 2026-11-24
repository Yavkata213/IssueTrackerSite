import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { paths } from './paths';
import { useAuth } from './authContext';
import { WorkspaceProvider } from './WorkspaceProvider';

interface JoinState {
  workspaceId?: string;
}

/**
 * The one place that guards the app: every route inside needs a signed-in user. Anyone else is
 * sent to the sign-in page and comes back to the page they asked for. The workspace data is
 * loaded only after sign-in and dropped on sign-out.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  // Right after joining a workspace by invitation, that workspace is the one to open. Read once:
  // later navigations carry no such state, and the workspace must not change then.
  const [joined] = useState(() => (location.state as JoinState | null)?.workspaceId);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Navigate to={paths.signIn} state={{ from: `${location.pathname}${location.search}` }} replace />;

  return (
    <WorkspaceProvider preferredWorkspaceId={typeof joined === 'string' ? joined : undefined}>
      <Outlet />
    </WorkspaceProvider>
  );
}
