import type { WorkspaceSettingsData } from '../../types';

/** Lets a tab update the page's settings data with what the API returned after a write. */
export type PatchWorkspaceData = (update: (data: WorkspaceSettingsData) => WorkspaceSettingsData) => void;
