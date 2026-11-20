// Permission keys the UI checks. They must match the keys of the permission catalog
// (`permissions.key` in docs/schema.sql). The catalog itself comes from the API.
export const PERMISSION = {
  issueEdit: 'issue.edit',
  issueComment: 'issue.comment',
  /** Change issue status: move issues between statuses. */
  issueMove: 'issue.move',
  issueAssignSelf: 'issue.assign.self',
  issueAssignOthers: 'issue.assign.others',
  issueDelete: 'issue.delete',
  sectionSettingsEdit: 'section.settings.edit',
  categoriesManage: 'section.categories.manage',
  /** Reorder, rename, recolour and remove statuses. */
  statusesManage: 'section.statuses.manage',
  /** Manage the roles of the section and who has them. */
  membersManage: 'section.members.manage',
  // Workspace-scope permissions (workspace roles).
  workspaceSectionsCreate: 'workspace.sections.create',
  workspaceSectionsEdit: 'workspace.sections.edit',
  workspaceSectionsDelete: 'workspace.sections.delete',
  workspaceSectionsAudit: 'workspace.sections.audit.view',
  /** Implied by every other workspace.members.* permission. */
  workspaceMembersView: 'workspace.members.view',
  workspaceMembersCreate: 'workspace.members.create',
  workspaceMembersEdit: 'workspace.members.edit',
  workspaceMembersDeactivate: 'workspace.members.deactivate',
  workspaceMembersAssignRoles: 'workspace.members.roles.assign',
  workspaceMembersInvite: 'workspace.members.invite',
  workspaceMembersRemove: 'workspace.members.remove',
  /** Opens the workspace settings page and edits the General tab. */
  workspaceSettingsEdit: 'workspace.settings.edit',
  /** Creates, edits and deletes workspace roles. */
  workspaceRolesManage: 'workspace.settings.roles',
} as const;

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];

/**
 * Hides or disables UI the user may not use. This is a convenience only: the backend
 * checks every request again and is the real enforcement.
 */
export function hasPermission(granted: readonly string[], key: PermissionKey): boolean {
  return granted.includes(key);
}

/** Headings of the permission groups in the role editor. */
const PERMISSION_GROUP_LABELS: Record<string, string> = {
  issue: 'Issues',
  section: 'Section',
  sections: 'Section',
  members: 'User management',
  settings: 'Workspace',
};

/** Group of a permission: `issue.edit` -> `issue`, `workspace.members.view` -> `members`. */
export function permissionGroupId(key: string): string {
  const parts = key.split('.');
  return (parts[0] === 'workspace' ? parts[1] : parts[0]) ?? key;
}

export function permissionGroupLabel(groupId: string): string {
  return PERMISSION_GROUP_LABELS[groupId] ?? groupId;
}

/** Permissions that are switched on by others: `View members` comes with every other member permission. */
const IMPLIED: Record<string, (key: string) => boolean> = {
  [PERMISSION.workspaceMembersView]: (key) => key.startsWith('workspace.members.'),
};

/** Keys that are on only because another enabled permission implies them. */
export function lockedKeys(enabled: readonly string[]): Set<string> {
  const locked = new Set<string>();
  for (const [implied, isImpliedBy] of Object.entries(IMPLIED)) {
    if (enabled.some((key) => key !== implied && isImpliedBy(key))) locked.add(implied);
  }
  return locked;
}

/** Adds the permissions that others imply. The API applies the same rule when it saves a role. */
export function withImplied(enabled: readonly string[]): string[] {
  return [...new Set([...enabled, ...lockedKeys(enabled)])];
}
