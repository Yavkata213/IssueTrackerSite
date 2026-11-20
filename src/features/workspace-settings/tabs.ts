import type { WorkspaceSettingsTab } from '../../app/paths';
import { PERMISSION } from '../../utils/permissions';

export const WORKSPACE_SETTINGS_TABS: {
  value: WorkspaceSettingsTab;
  label: string;
  /** Permission needed to see the tab. General is always open on this page. */
  permission: string | null;
}[] = [
  { value: 'general', label: 'General', permission: null },
  { value: 'roles', label: 'Roles & permissions', permission: PERMISSION.workspaceRolesManage },
  { value: 'members', label: 'Members', permission: PERMISSION.workspaceMembersView },
];
