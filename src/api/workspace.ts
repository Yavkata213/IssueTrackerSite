// Workspace settings API: General, Roles & permissions, Members. Same rules as `settings.ts`:
// scoped by workspace, validated and permission-checked like the server will, writes are
// recorded in the workspace audit log, and `ApiError` is thrown for refusals.

import type {
  MemberSort,
  RoleDetail,
  Role,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberPage,
  WorkspaceMemberQuery,
  WorkspaceSettingsData,
} from '../types';
import { LIMITS } from '../utils/limits';
import { PERMISSION, withImplied } from '../utils/permissions';
import { isValidWorkspaceSlug } from '../utils/workspaceSlug';
import { ApiError } from './errors';
import { invitationRows } from './invitations';
import type { RoleInput } from './internal';
import {
  cleanText,
  clone,
  readRoleInput,
  recordAudit,
  requireWorkspace,
  requireWorkspacePermission,
  workspacePermissionsOf,
} from './internal';
import {
  rolePermissionKeys,
  roles,
  sectionMembers,
  sections,
  users,
  workspaceMembers,
  workspacePermissionCatalog,
  workspaces,
} from './mockData';

const OWNER_ROLE_NAME = 'Owner';
const MAX_PAGE_SIZE = 100;

function workspaceRolesOf(workspaceId: string): Role[] {
  return roles.filter((r) => r.workspaceId === workspaceId && r.scope === 'WORKSPACE');
}

function toRoleDetail(role: Role): RoleDetail {
  return {
    ...role,
    memberCount: workspaceMembers.filter((m) => m.workspaceId === role.workspaceId && m.roleId === role.id).length,
    permissionKeys: [...(rolePermissionKeys[role.id] ?? [])],
  };
}

/**
 * GET /workspaces/{workspaceId}/settings
 * Everything the General and Roles tabs show. Throws FORBIDDEN without `workspace.settings.edit`.
 */
export async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettingsData> {
  const workspace = requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceSettingsEdit);
  return clone({
    workspace,
    permissions: workspacePermissionsOf(workspaceId),
    roles: workspaceRolesOf(workspaceId).map(toRoleDetail),
    permissionCatalog: workspacePermissionCatalog,
    sections: sections.filter((s) => s.workspaceId === workspaceId),
  });
}

// ---- General --------------------------------------------------------

/** What happens to the logo when the form is saved. */
export type LogoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; file: File };

export interface WorkspaceGeneralInput {
  name: string;
  /** Lowercase letters, digits and hyphens; unique across all workspaces. */
  slug: string;
  /** A WORKSPACE-scope role of this workspace. */
  defaultRoleId: string;
  logo: LogoChange;
}

const LOGO_TYPES = ['image/png', 'image/jpeg'];

/**
 * PATCH /workspaces/{workspaceId}   (multipart when the logo is replaced)
 * Needs `workspace.settings.edit`. Returns the updated workspace.
 * The real endpoint also checks that the logo is a square PNG/JPG of at least 128 x 128 px.
 */
export async function updateWorkspaceGeneral(workspaceId: string, input: WorkspaceGeneralInput): Promise<Workspace> {
  const workspace = requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceSettingsEdit);

  const name = cleanText(input.name, 'Workspace name', LIMITS.workspaceName, true, 'name');
  const slug = input.slug.trim();
  if (!isValidWorkspaceSlug(slug)) {
    throw new ApiError(
      'VALIDATION',
      `Use ${LIMITS.workspaceSlugMin}–${LIMITS.workspaceSlugMax} lowercase letters, digits and hyphens.`,
      'slug',
    );
  }
  if (workspaces.some((w) => w.id !== workspaceId && w.slug === slug)) {
    throw new ApiError('VALIDATION', 'This URL is already used by another workspace.', 'slug');
  }
  if (!workspaceRolesOf(workspaceId).some((r) => r.id === input.defaultRoleId)) {
    throw new ApiError('VALIDATION', 'Choose one of the workspace roles.', 'defaultRoleId');
  }
  if (input.logo.kind === 'replace') {
    const { file } = input.logo;
    if (!LOGO_TYPES.includes(file.type)) throw new ApiError('VALIDATION', 'The logo must be a PNG or JPG image.', 'logo');
    if (file.size > LIMITS.logoBytes) throw new ApiError('VALIDATION', 'The logo must be at most 2 MB.', 'logo');
  }

  workspace.name = name;
  workspace.slug = slug;
  workspace.defaultRoleId = input.defaultRoleId;
  // The backend stores the file and returns its URL; the mock keeps a temporary local one.
  if (input.logo.kind === 'remove') workspace.logoUrl = null;
  if (input.logo.kind === 'replace') workspace.logoUrl = URL.createObjectURL(input.logo.file);

  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'workspace.updated', targetType: 'WORKSPACE', targetId: workspaceId });
  return clone(workspace);
}

// ---- Roles ----------------------------------------------------------

function requireEditableRole(workspaceId: string, roleId: string): Role {
  const role = workspaceRolesOf(workspaceId).find((r) => r.id === roleId);
  if (!role) throw new ApiError('NOT_FOUND', 'Role not found.');
  if (role.name === OWNER_ROLE_NAME && role.isSystem) throw new ApiError('FORBIDDEN', 'The Owner role cannot be changed.');
  return role;
}

/** POST /workspaces/{workspaceId}/roles. Needs `workspace.settings.roles`. Returns the new role. */
export async function createWorkspaceRole(workspaceId: string, input: RoleInput): Promise<RoleDetail> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceRolesManage);
  const values = readRoleInput(workspaceId, 'WORKSPACE', workspacePermissionCatalog, null, input);

  const role: Role = {
    id: crypto.randomUUID(),
    workspaceId,
    scope: 'WORKSPACE',
    name: values.name,
    description: values.description,
    isSystem: false,
  };
  roles.push(role);
  rolePermissionKeys[role.id] = withImplied(values.permissionKeys);
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'role.created', targetType: 'ROLE', targetId: role.id });
  return clone(toRoleDetail(role));
}

/**
 * PUT /workspaces/{workspaceId}/roles/{roleId}
 * Needs `workspace.settings.roles`. Members of the role get the new permissions at once.
 * The Owner role cannot be changed. "View members" is added when another member permission is on.
 */
export async function updateWorkspaceRole(workspaceId: string, roleId: string, input: RoleInput): Promise<RoleDetail> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceRolesManage);
  const role = requireEditableRole(workspaceId, roleId);
  const values = readRoleInput(workspaceId, 'WORKSPACE', workspacePermissionCatalog, roleId, input);

  role.name = values.name;
  role.description = values.description;
  rolePermissionKeys[role.id] = withImplied(values.permissionKeys);
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'role.updated', targetType: 'ROLE', targetId: role.id });
  return clone(toRoleDetail(role));
}

/**
 * DELETE /workspaces/{workspaceId}/roles/{roleId}
 * Needs `workspace.settings.roles`. Refused for the Owner role, the default role of the
 * workspace and roles that still have members.
 */
export async function deleteWorkspaceRole(workspaceId: string, roleId: string): Promise<void> {
  const workspace = requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceRolesManage);
  const role = requireEditableRole(workspaceId, roleId);
  if (role.isSystem) throw new ApiError('VALIDATION', 'Built-in roles cannot be deleted.');
  if (workspace.defaultRoleId === roleId) {
    throw new ApiError('VALIDATION', 'This is the default role for new members. Choose another default first.');
  }
  if (workspaceMembers.some((m) => m.workspaceId === workspaceId && m.roleId === roleId)) {
    throw new ApiError('VALIDATION', 'This role still has members. Move them to another role first.');
  }

  roles.splice(roles.findIndex((r) => r.id === roleId), 1);
  delete rolePermissionKeys[roleId];
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'role.deleted', targetType: 'ROLE', targetId: roleId });
}

// ---- Members --------------------------------------------------------

function lastActiveRank(member: WorkspaceMember): number {
  return member.lastActiveAt ? Date.parse(member.lastActiveAt) : Number.NEGATIVE_INFINITY;
}

const SORTERS: Record<MemberSort, (a: WorkspaceMember, b: WorkspaceMember) => number> = {
  name: (a, b) => a.user.displayName.localeCompare(b.user.displayName),
  lastActive: (a, b) => lastActiveRank(b) - lastActiveRank(a),
  joined: (a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt),
};

/**
 * GET /workspaces/{workspaceId}/members?search=&roleId=&sectionId=&status=&sort=&page=&size=
 * Needs `workspace.members.view`. Filtering, sorting and paging are done by the server.
 * Invited people (pending invitations) are rows with status `INVITED`; they have no section roles.
 */
export async function listWorkspaceMembers(
  workspaceId: string,
  query: WorkspaceMemberQuery,
): Promise<WorkspaceMemberPage> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceMembersView);

  if (!Number.isInteger(query.page) || query.page < 0) throw new ApiError('VALIDATION', 'Invalid page.');
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > MAX_PAGE_SIZE) {
    throw new ApiError('VALIDATION', 'Invalid page size.');
  }
  const search = query.search.trim().toLowerCase();
  if (search.length > LIMITS.memberSearch) throw new ApiError('VALIDATION', 'The search text is too long.');
  if (query.roleId !== null && !workspaceRolesOf(workspaceId).some((r) => r.id === query.roleId)) {
    throw new ApiError('VALIDATION', 'Unknown role.');
  }
  if (query.sectionId !== null && !sections.some((s) => s.id === query.sectionId && s.workspaceId === workspaceId)) {
    throw new ApiError('VALIDATION', 'Unknown section.');
  }
  if (!(query.sort in SORTERS)) throw new ApiError('VALIDATION', 'Unknown sort order.');

  const records = workspaceMembers.filter((m) => m.workspaceId === workspaceId);
  const rows: WorkspaceMember[] = [];
  for (const record of records) {
    const user = users.find((u) => u.id === record.userId);
    if (!user) continue;
    const sectionRoles = sectionMembers
      .filter((m) => m.workspaceId === workspaceId && m.userId === record.userId)
      .flatMap((m) => {
        const section = sections.find((s) => s.id === m.sectionId);
        const role = roles.find((r) => r.id === m.roleId);
        return section && role ? [{ sectionId: section.id, sectionName: section.name, roleName: role.name }] : [];
      });
    rows.push({
      user,
      roleId: record.roleId,
      roleName: roles.find((r) => r.id === record.roleId)?.name ?? '',
      status: record.status,
      invitation: null,
      joinedAt: record.joinedAt,
      lastActiveAt: record.lastActiveAt,
      sectionRoles,
    });
  }

  // People who were invited and have not joined yet are rows too (status INVITED).
  rows.push(...invitationRows(workspaceId));

  const matching = rows
    .filter(
      (m) =>
        (search === '' || `${m.user.displayName} ${m.user.email}`.toLowerCase().includes(search)) &&
        (query.roleId === null || m.roleId === query.roleId) &&
        (query.sectionId === null || m.sectionRoles.some((r) => r.sectionId === query.sectionId)) &&
        (query.status === 'ALL' || m.status === query.status),
    )
    .sort(SORTERS[query.sort]);

  return clone({
    items: matching.slice(query.page * query.pageSize, (query.page + 1) * query.pageSize),
    total: matching.length,
    counts: {
      all: rows.length,
      active: rows.filter((m) => m.status === 'ACTIVE').length,
      invited: rows.filter((m) => m.status === 'INVITED').length,
      deactivated: rows.filter((m) => m.status === 'DEACTIVATED').length,
    },
  });
}
