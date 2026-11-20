import { createContext, useContext } from 'react';
import type { SidebarSection, User, WorkspaceSummary } from '../types';

export interface WorkspaceContextValue {
  currentUser: User;
  workspaces: WorkspaceSummary[];
  /** The selected workspace. The frontend always works inside exactly one. */
  workspace: WorkspaceSummary;
  selectWorkspace: (workspaceId: string) => void;
  /** Sections of the selected workspace; empty until they are loaded. */
  sections: SidebarSection[];
  /** False while the sections of the selected workspace are loading. */
  sectionsReady: boolean;
  setSectionPinned: (sectionId: string, pinned: boolean) => void;
  /** Loads the sections again, e.g. after the section settings changed a name, key or icon. */
  reloadSections: () => void;
  /** Loads the workspaces again, e.g. after the workspace settings changed a name or logo. */
  reloadWorkspaces: () => void;
  unreadCount: number;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return value;
}
