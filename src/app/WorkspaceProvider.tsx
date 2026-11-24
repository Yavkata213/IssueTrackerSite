import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getCurrentUser,
  getErrorMessage,
  getUnreadNotificationCount,
  listSidebarSections,
  listWorkspaces,
  setSectionPinned as apiSetSectionPinned,
} from '../api';
import { ErrorToast, LoadError } from '../components/common';
import { NoWorkspacePage } from '../features/onboarding/NoWorkspacePage';
import type { SidebarSection, User, WorkspaceSummary } from '../types';
import { WorkspaceContext } from './workspaceContext';
import type { WorkspaceContextValue } from './workspaceContext';

interface WorkspaceProviderProps {
  children: ReactNode;
  /** Opened first when the user belongs to it (right after accepting an invitation). */
  preferredWorkspaceId?: string;
}

/** Sidebar data of one workspace. Tagged with the workspace so it is never shown for another. */
interface SidebarData {
  workspaceId: string;
  sections: SidebarSection[];
  unread: number;
}

export function WorkspaceProvider({ children, preferredWorkspaceId }: WorkspaceProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState<SidebarData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  // The workspace to open when the list is (re)loaded: the one the person just joined or created.
  const [wantedId, setWantedId] = useState<string | undefined>(preferredWorkspaceId);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentUser(), listWorkspaces()])
      .then(([user, list]) => {
        if (cancelled) return;
        setCurrentUser(user);
        setWorkspaces(list);
        setWorkspaceId((list.find((w) => w.id === wantedId) ?? list[0])?.id ?? null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, wantedId]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    Promise.all([listSidebarSections(workspaceId), getUnreadNotificationCount(workspaceId)])
      .then(([sections, unread]) => {
        if (!cancelled) setSidebar({ workspaceId, sections, unread });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSidebar({ workspaceId, sections: [], unread: 0 });
        setToast(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const setSectionPinned = useCallback(
    (sectionId: string, pinned: boolean) => {
      if (!workspaceId) return;
      const apply = (value: boolean) =>
        setSidebar((prev) =>
          prev && prev.workspaceId === workspaceId
            ? { ...prev, sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, pinned: value } : s)) }
            : prev,
        );
      apply(pinned);
      apiSetSectionPinned(workspaceId, sectionId, pinned).catch((error: unknown) => {
        apply(!pinned);
        setToast(getErrorMessage(error));
      });
    },
    [workspaceId],
  );

  const reloadSections = useCallback(() => {
    if (!workspaceId) return;
    listSidebarSections(workspaceId)
      .then((sections) =>
        setSidebar((prev) => (prev && prev.workspaceId === workspaceId ? { ...prev, sections } : prev)),
      )
      .catch((error: unknown) => setToast(getErrorMessage(error)));
  }, [workspaceId]);

  const reloadWorkspaces = useCallback(() => {
    listWorkspaces()
      .then(setWorkspaces)
      .catch((error: unknown) => setToast(getErrorMessage(error)));
  }, []);

  const retry = useCallback(() => {
    setLoadError(null);
    setAttempt((value) => value + 1);
  }, []);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  // Data of the previous workspace is dropped the moment another one is selected.
  const current = sidebar && sidebar.workspaceId === workspaceId ? sidebar : null;

  const value = useMemo<WorkspaceContextValue | null>(() => {
    if (!currentUser || !workspace) return null;
    return {
      currentUser,
      workspaces,
      workspace,
      selectWorkspace: setWorkspaceId,
      sections: current?.sections ?? [],
      sectionsReady: current !== null,
      setSectionPinned,
      reloadSections,
      reloadWorkspaces,
      unreadCount: current?.unread ?? 0,
    };
  }, [currentUser, workspace, workspaces, current, setSectionPinned, reloadSections, reloadWorkspaces]);

  if (loadError) return <LoadError message={loadError} onRetry={retry} />;
  // Signed in, but not in any workspace yet (for example the only one removed them).
  if (currentUser && workspaces.length === 0) {
    return (
      <NoWorkspacePage
        onEntered={(workspaceId) => {
          setWantedId(workspaceId);
          retry();
        }}
      />
    );
  }
  if (!value) return null;
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      <ErrorToast message={toast} onClose={() => setToast(null)} />
    </WorkspaceContext.Provider>
  );
}
